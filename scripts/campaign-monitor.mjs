import fs from 'node:fs/promises';
import path from 'node:path';
import {root,readJson,writeJson,sha256} from './lib.mjs';

const now=new Date();
const nowIso=now.toISOString();
const [sourceData,keywords,campaigns]=await Promise.all([
  readJson('data/campaign-sources.json'),readJson('data/campaign-keywords.json'),readJson('data/campaigns.json')
]);
const report={runAt:nowIso,sources:[],candidateCount:0,publicChecks:[],warnings:[]};

const clean=value=>String(value??'').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g,token=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[token]??token)).replace(/\s+/g,' ').trim();
const lower=value=>clean(value).toLowerCase();
const matches=(text,terms)=>terms.some(term=>lower(text).includes(String(term).toLowerCase()));
function score(text,source,hasDate,hasOfficial){
  let value=source.tier==='official'?40:source.tier==='aggregator'?22:10;
  if(matches(text,keywords.subjects))value+=15;
  if(matches(text,keywords.benefits))value+=20;
  if(hasDate)value+=15;
  if(hasOfficial)value+=15;
  if(matches(text,keywords.riskTerms))value-=60;
  return value;
}
async function fetchText(url,accept='application/json,text/xml,application/rss+xml,text/html;q=0.8,*/*;q=0.5'){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(url,{headers:{'user-agent':'ai-free-opportunities-campaign-monitor/1.0','accept':accept},signal:controller.signal,redirect:'follow'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const text=await response.text();
    if(!text.trim())throw new Error('空响应');
    if(text.length>8*1024*1024)throw new Error('响应超过8MB');
    return text;
  }finally{clearTimeout(timer);}
}
function rssItems(xml,source){
  const blocks=xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)??[];
  return blocks.map((block,index)=>{
    const pick=tag=>clean((block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,'i'))??[])[1]);
    const link=pick('link')||(block.match(/<link[^>]+href=["']([^"']+)/i)??[])[1]||source.url;
    const title=pick('title');const publishedAt=pick('pubDate')||pick('published')||pick('updated')||null;
    return {id:`${source.id}-${sha256(`${title}|${link}`).slice(0,12)}`,targetProduct:null,title,benefitType:'待提取',accessThreshold:'待官方核验',claimMethod:'待官方核验',startAt:publishedAt,validUntil:null,sourceUrl:link,discoveryUrl:link,sourceId:source.id,sourceName:source.name,sourceTier:source.tier,evidenceStatus:'candidate',riskNotes:'来自发现源，尚未回到厂商官方页面核验。',detectedAt:nowIso,score:score(`${title} ${pick('description')} ${pick('summary')}`,source,Boolean(publishedAt),false),status:'candidate',_index:index};
  }).filter(item=>item.title&&matches(item.title,keywords.benefits)&&!matches(item.title,keywords.riskTerms));
}
function dealItems(payload,source){
  return (payload.deals??[]).filter(item=>{
    const text=`${item.title} ${item.discountInfo} ${item.description} ${(item.benefitType??[]).join(' ')}`;
    return item.pricingModel==='free'||matches(text,keywords.benefits);
  }).filter(item=>!item.expiresAt||new Date(`${item.expiresAt}T23:59:59+08:00`)>=now).map(item=>({
    id:`${source.id}-${item.id}`,targetProduct:item.vendor,title:item.title,benefitType:(item.benefitType??[]).join(', ')||item.category,
    accessThreshold:item.eligibility||'待官方核验',claimMethod:item.claimRequirements?.manualApplication?'需要申请，路径待官方核验':'访问官方页面按规则领取',
    startAt:item.firstSeen??null,validUntil:item.expiresAt??null,sourceUrl:item.url,discoveryUrl:item.sourceUrl||source.url,sourceId:source.id,sourceName:source.name,sourceTier:source.tier,
    evidenceStatus:item.verified?'aggregator_verified':'candidate',riskNotes:item.verified?'仍需本站复核官方页面。':'聚合器未标记人工核验，不能直接公开。',detectedAt:nowIso,
    score:score(`${item.title} ${item.discountInfo} ${item.description}`,source,Boolean(item.expiresAt),Boolean(item.url)),status:'candidate'
  }));
}
function aihotItems(payload,source){
  return (payload.items??[]).filter(item=>matches(item.title,keywords.benefits)&&!matches(item.title,keywords.riskTerms)).map(item=>({
    id:`${source.id}-${item.id}`,targetProduct:null,title:clean(item.title),benefitType:'待提取',accessThreshold:'待官方核验',claimMethod:'待官方核验',startAt:item.publishedAt??null,validUntil:null,
    sourceUrl:item.links?.original??source.url,discoveryUrl:item.links?.aihot??source.url,sourceId:source.id,sourceName:source.name,sourceTier:source.tier,evidenceStatus:'candidate',riskNotes:'AIHOT 仅作内部发现，不得公开镜像其内容。',detectedAt:nowIso,
    score:score(item.title,source,Boolean(item.publishedAt),Boolean(item.links?.original)),status:'candidate'
  }));
}

const candidates=[];
for(const source of sourceData.items.filter(item=>item.status==='active')){
  try{
    const text=await fetchText(source.machineUrl);
    let items=[];
    if(source.mode==='rss')items=rssItems(text,source);
    if(source.mode==='deals_json')items=dealItems(JSON.parse(text),source);
    if(source.mode==='aihot_json')items=aihotItems(JSON.parse(text),source);
    const accepted=items.filter(item=>item.score>=35).sort((a,b)=>b.score-a.score).slice(0,100);
    candidates.push(...accepted);source.lastSuccessAt=nowIso;source.lastError=null;source.health='ok';
    report.sources.push({id:source.id,outcome:'ok',candidates:accepted.length});
  }catch(error){
    source.lastError=String(error.message??error);source.health=/HTTP (401|403|429)/.test(source.lastError)?'blocked':'failed';
    report.sources.push({id:source.id,outcome:source.health,error:source.lastError});report.warnings.push(`${source.name}: ${source.lastError}`);
  }
  source.lastAttemptAt=nowIso;
}

const deduped=[...new Map(candidates.map(item=>[`${lower(item.targetProduct)}|${lower(item.title)}|${item.sourceUrl}`,item])).values()].sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'zh-CN'));
await writeJson('.runtime/candidates/campaigns.json',{schemaVersion:'1.0.0',generatedAt:nowIso,note:'私有候选。任何条目均须回到厂商官方页补齐六项字段并通过容量门槛后才能进入 data/campaigns.json。',items:deduped});
report.candidateCount=deduped.length;

for(const item of campaigns.items){
  if(item.validUntil&&new Date(`${item.validUntil}T23:59:59+08:00`)<now){item.status='archived';report.publicChecks.push({id:item.id,outcome:'expired'});continue;}
  try{
    const text=lower(await fetchText(item.sourceUrl,'text/html,application/json;q=0.8,*/*;q=0.5'));
    const ended=/活动已结束|优惠已结束|已领完|page not found|404 not found/.test(text);
    report.publicChecks.push({id:item.id,outcome:ended?'needs_manual_review':'reachable'});
    if(ended)report.warnings.push(`${item.title}: 官方页出现结束或失效关键词，需要人工确认；本轮不自动删除。`);
  }catch(error){report.publicChecks.push({id:item.id,outcome:'unreachable',error:String(error.message??error)});report.warnings.push(`${item.title}: 官方页暂不可达，保留上次有效状态。`);}
}

await writeJson('data/campaign-sources.json',sourceData);
await writeJson('data/campaigns.json',campaigns);
await fs.mkdir(path.join(root,'.runtime/reports'),{recursive:true});
await fs.writeFile(path.join(root,'.runtime/reports','campaign-latest.json'),JSON.stringify({...report,reportHash:sha256(JSON.stringify(report))},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.sources.length&&!report.sources.some(source=>source.outcome==='ok'))process.exitCode=10;
