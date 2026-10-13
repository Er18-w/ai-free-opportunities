import fs from 'node:fs/promises';
import path from 'node:path';
import {root,readJson,writeJson,sha256} from './lib.mjs';
import {clean,lower,matchesBenefit,hasRiskSignal,parseDate,canonicalUrl,discoveryScore,clusterCandidates,mergeLedger} from './campaign-core.mjs';
import {resourceLinks} from './source-policy.mjs';

const now=new Date(),nowIso=now.toISOString();
const bootstrap=process.argv.includes('--bootstrap')||process.env.CAMPAIGN_BOOTSTRAP==='1';
const forceDiscovery=process.argv.includes('--force')||process.env.FORCE_ALL_SOURCES==='1';
const bootstrapStart=process.env.DISCOVERY_START||'2026-06-01';
const cutoff=new Date(`${bootstrapStart}T00:00:00Z`);
const bootstrapDays=Math.ceil((now-cutoff)/86400000);
const [sourceData,keywords,offers]=await Promise.all([readJson('data/campaign-sources.json'),readJson('data/campaign-keywords.json'),readJson('data/offers.json')]);
const report={runAt:nowIso,mode:bootstrap?'bootstrap':'incremental',bootstrapStart:bootstrap?bootstrapStart:null,bootstrapDays,sources:[],candidateCount:0,clusterCount:0,publicChecks:[],warnings:[]};
const statePath='.runtime/state/campaign-state.json';
let state={sources:{},ledger:[]};try{state=await readJson(statePath);}catch{}
if(process.argv.includes('--reset')){state={sources:{},ledger:[]};for(const source of sourceData.items)source.failureStreak=0;}

function due(source){if(bootstrap||forceDiscovery)return true;const last=source.lastAttemptAt&&parseDate(source.lastAttemptAt);return !last||now-last>=Number(source.cadenceHours||6)*3600000;}
async function fetchText(source,accept='application/json,text/xml,application/rss+xml,text/html;q=0.8,*/*;q=0.5'){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000),prior=state.sources[source.id]??{};
  const headers={'user-agent':'ai-free-opportunities-campaign-monitor/2.0','accept':accept};
  if(!bootstrap&&prior.etag)headers['if-none-match']=prior.etag;if(!bootstrap&&prior.lastModified)headers['if-modified-since']=prior.lastModified;
  try{
    const response=await fetch(source.machineUrl,{headers,signal:controller.signal,redirect:'follow'});
    if(response.status===304)return {notModified:true,text:null};if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const text=await response.text();if(!text.trim())throw new Error('空响应');if(text.length>8*1024*1024)throw new Error('响应超过8MB');
    state.sources[source.id]={etag:response.headers.get('etag'),lastModified:response.headers.get('last-modified'),lastSuccessAt:nowIso};return {notModified:false,text};
  }finally{clearTimeout(timer);}
}
function baseItem(source,title,url,publishedAt,extra={}){
  const text=`${title} ${extra.summary??''}`;
  return {id:`${source.id}-${sha256(`${title}|${url}`).slice(0,12)}`,targetProduct:extra.targetProduct??null,title,benefitType:extra.benefitType??'待提取',accessThreshold:extra.accessThreshold??'待官方核验',claimMethod:extra.claimMethod??'待官方核验',publishedAt:publishedAt??null,startAt:extra.startAt??publishedAt??null,validUntil:extra.validUntil??null,sourceUrl:canonicalUrl(extra.sourceUrl??url),discoveryUrl:canonicalUrl(extra.discoveryUrl??url),sourceId:source.id,sourceName:source.name,sourceTier:source.tier,evidenceStatus:extra.evidenceStatus??'candidate',riskNotes:extra.riskNotes??'来自发现源，尚未回到厂商官方页面核验。',discoveryExcerpt:clean(extra.summary??'').slice(0,500)||null,detectedAt:nowIso,discoveryScore:discoveryScore({text,source,hasDate:Boolean(publishedAt||extra.validUntil),hasOfficial:Boolean(extra.hasOfficial),keywords}),status:'candidate'};
}
function keepByWindow(item){if(!bootstrap)return !item.validUntil||parseDate(`${item.validUntil}T23:59:59+08:00`)>=now;const date=parseDate(item.publishedAt||item.startAt||item.validUntil);return !date||date>=cutoff||parseDate(`${item.validUntil}T23:59:59+08:00`)>=now;}
function rssItems(xml,source){
  const blocks=xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)??[];
  return blocks.map(block=>{const pick=tag=>clean((block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,'i'))??[])[1]);const link=pick('link')||(block.match(/<link[^>]+href=["']([^"']+)/i)??[])[1]||source.url;const title=pick('title'),summary=`${pick('description')} ${pick('summary')}`,publishedAt=pick('pubDate')||pick('published')||pick('updated')||null;return {item:baseItem(source,title,link,publishedAt,{summary}),discoveryText:`${title} ${summary}`};}).filter(({item,discoveryText})=>item.title&&matchesBenefit(discoveryText,keywords.benefits)&&!hasRiskSignal(discoveryText,keywords.riskTerms)).map(({item})=>item).filter(keepByWindow);
}
function dealItems(payload,source){
  return (payload.deals??[]).map(item=>{const text=`${item.title} ${item.discountInfo} ${item.description} ${(item.benefitType??[]).join(' ')}`;if(item.pricingModel!=='free'&&!matchesBenefit(text,keywords.benefits))return null;return baseItem(source,item.title,item.url,item.firstSeen??null,{targetProduct:item.vendor,benefitType:(item.benefitType??[]).join(', ')||item.category,accessThreshold:item.eligibility||'待官方核验',claimMethod:item.claimRequirements?.manualApplication?'需要申请，路径待官方核验':'访问官方页面按规则领取',validUntil:item.expiresAt??null,sourceUrl:item.url,discoveryUrl:item.sourceUrl||source.url,evidenceStatus:item.verified?'aggregator_verified':'candidate',riskNotes:item.verified?'聚合器已复核，但公开前仍须本站核对官方页面。':'聚合器未标记人工核验，不能直接公开。',summary:text,hasOfficial:Boolean(item.url)});}).filter(Boolean).filter(keepByWindow);
}
function aihotItems(payload,source){return (payload.items??[]).filter(item=>matchesBenefit(item.title,keywords.benefits)&&!hasRiskSignal(item.title,keywords.riskTerms)).map(item=>baseItem(source,clean(item.title),item.links?.original??source.url,item.publishedAt??null,{sourceUrl:item.links?.original??source.url,discoveryUrl:item.links?.aihot??source.url,riskNotes:'AIHOT 仅作内部发现，不得公开镜像其内容。',hasOfficial:Boolean(item.links?.original)})).filter(keepByWindow);}

const candidates=[];
for(const source of sourceData.items.filter(item=>item.status==='active')){
  if(!due(source)){report.sources.push({id:source.id,outcome:'not_due'});continue;}
  try{
    const result=await fetchText(source);if(result.notModified){source.lastAttemptAt=nowIso;report.sources.push({id:source.id,outcome:'not_modified'});continue;}
    let items=[];if(source.mode==='rss')items=rssItems(result.text,source);if(source.mode==='deals_json')items=dealItems(JSON.parse(result.text),source);if(source.mode==='aihot_json')items=aihotItems(JSON.parse(result.text),source);
    if(source.mode==='model_resource_html')items=resourceLinks(result.text,source.machineUrl).filter(item=>matchesBenefit(item.summary,keywords.benefits)&&!hasRiskSignal(item.summary,keywords.riskTerms)).map(item=>baseItem(source,item.title,item.url,null,{summary:item.summary,discoveryUrl:item.url,riskNotes:'聚合资源目录；无可信发布时间，不能直接公开。官方地址和免费规则需补齐。'}));
    const accepted=items.filter(item=>item.discoveryScore>=(bootstrap?22:30)).sort((a,b)=>b.discoveryScore-a.discoveryScore).slice(0,bootstrap?500:150);
    candidates.push(...accepted);source.lastSuccessAt=nowIso;source.lastError=null;source.health='ok';source.failureStreak=0;report.sources.push({id:source.id,outcome:'ok',candidates:accepted.length});
  }catch(error){source.lastError=String(error.message??error);source.health=/HTTP (401|403|429)/.test(source.lastError)?'blocked':'failed';source.failureStreak=(source.failureStreak??0)+1;report.sources.push({id:source.id,outcome:source.health,error:source.lastError,failureStreak:source.failureStreak});report.warnings.push(`${source.name}: ${source.lastError}`);}
  source.lastAttemptAt=nowIso;
}
const exact=[...new Map(candidates.map(item=>[`${lower(item.title)}|${canonicalUrl(item.sourceUrl)}`,item])).values()],clustered=clusterCandidates(exact);
state.ledger=mergeLedger(state.ledger??[],clustered,nowIso).slice(0,2000);state.updatedAt=nowIso;await writeJson(statePath,state);
await writeJson('.runtime/candidates/campaigns.json',{schemaVersion:'2.0.0',generatedAt:nowIso,mode:report.mode,windowStart:bootstrap?cutoff.toISOString():null,note:'私有候选事件。发现分仅用于安排复核顺序，不代表可以公开；必须回到厂商官方页补齐字段并通过任务容量门槛。',items:state.ledger});
report.candidateCount=exact.length;report.clusterCount=clustered.length;
for(const item of offers.items){
  if(item.validUntil&&new Date(`${item.validUntil}T23:59:59+08:00`)<now){item.status='archived';report.publicChecks.push({id:item.id,outcome:'expired'});continue;}
  try{const result=await fetchText({id:`public-${item.id}`,machineUrl:item.sourceUrl},'text/html,application/json;q=0.8,*/*;q=0.5');const page=lower(result.text??''),ended=/活动已结束|优惠已结束|已领完|page not found|404 not found/.test(page);report.publicChecks.push({id:item.id,outcome:ended?'needs_manual_review':'reachable'});if(ended)report.warnings.push(`${item.title}: 官方页出现结束或失效关键词，需要人工确认；本轮不自动删除。`);}
  catch(error){report.publicChecks.push({id:item.id,outcome:'unreachable',error:String(error.message??error)});report.warnings.push(`${item.title}: 官方页暂不可达，保留上次有效状态。`);}
}
await writeJson('data/campaign-sources.json',sourceData);await writeJson('data/offers.json',offers);
await fs.mkdir(path.join(root,'.runtime/reports'),{recursive:true});await fs.writeFile(path.join(root,'.runtime/reports',bootstrap?'campaign-bootstrap.json':'campaign-latest.json'),JSON.stringify({...report,reportHash:sha256(JSON.stringify(report))},null,2)+'\n');
console.log(JSON.stringify(report,null,2));const attempted=report.sources.filter(source=>!['not_due','not_modified'].includes(source.outcome));if(attempted.length&&!attempted.some(source=>source.outcome==='ok'))process.exitCode=10;
