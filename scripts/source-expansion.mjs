import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {readJson,writeJson} from './lib.mjs';

const now=new Date();
const nowIso=now.toISOString();
const bootstrap=process.argv.includes('--bootstrap')||process.env.SOURCE_BOOTSTRAP==='1';
const [sourceMap,keywords]=await Promise.all([readJson('data/source-map.json'),readJson('data/campaign-keywords.json')]);
const statePath='.runtime/state/official-page-state.json';
let state={pages:{},vendors:{}};
try{state=await readJson(statePath);}catch{}

const dayNumber=Math.floor(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())/86400000);
const cadence=sourceMap.priorityCadenceDays??{A:1,B:3,C:7};
function selectedToday(item,index){
  if(bootstrap)return true;
  const days=Number(cadence[item.priority]??7);
  if(days===1)return true;
  return (dayNumber+index)%days===0;
}
const selected=sourceMap.items.filter(selectedToday);

const isoDate=date=>date.toISOString().slice(0,10);
const daysAgo=days=>new Date(now.valueOf()-days*86400000);
const recentStart=isoDate(daysAgo(30));
const archiveStart=isoDate(daysAgo(90));
const archiveEnd=isoDate(daysAgo(31));
const benefitCn='(限时免费 OR 公测免费 OR 送会员 OR 兑换码 OR 免费额度 OR 送 Token OR 学生免费 OR 新人礼包)';
const benefitEn='("limited time free" OR "public beta" OR "free credits" OR "free tier" OR "student free" OR "promo code")';
const queryUrl=query=>`https://www.google.com/search?q=${encodeURIComponent(query)}`;
function productQueries(vendor){
  const names=[vendor.name,...vendor.aliases].slice(0,4).map(name=>`"${name}"`).join(' OR ');
  const benefit=vendor.region==='CN'?benefitCn:benefitEn;
  const queries=[
    {window:'recent-30d',purpose:'近期广搜',query:`(${names}) ${benefit} after:${recentStart}`},
    {window:'current',purpose:'当前权益核对',query:`(${names}) (pricing OR 价格 OR quota OR 额度 OR rate limits OR 免费) site:${new URL(vendor.officialUrls[0].url).hostname}`}
  ];
  if(bootstrap)queries.push({window:'day-31-to-90',purpose:'历史公告补漏',query:`(${names}) ${benefit} after:${archiveStart} before:${archiveEnd}`});
  return queries.map(item=>({...item,url:queryUrl(item.query)}));
}

const genericQueries=[
  `AI ${benefitCn} after:${recentStart} site:linux.do`,
  `AI ${benefitCn} after:${recentStart} site:v2ex.com`,
  `${benefitCn} AI 模型 after:${recentStart} site:mp.weixin.qq.com`,
  `AI ${benefitCn} after:${recentStart} (site:jike.com OR site:xiaohongshu.com)`,
  `AI ${benefitEn} after:${recentStart} (site:reddit.com/r/LocalLLaMA OR site:reddit.com/r/ChatGPTCoding)`,
  `AI API ${benefitEn} after:${recentStart}`
].map(query=>({query,url:queryUrl(query)}));

const plan={
  schemaVersion:'1.0.0',generatedAt:nowIso,mode:bootstrap?'bootstrap':'daily',
  windows:{recent30Days:{from:recentStart,to:isoDate(now)},archiveBackfill:bootstrap?{from:archiveStart,to:archiveEnd}:null},
  instructions:['搜索结果只进入私有候选区。','聚合站和社区用于发现，公开前必须回到厂商官方页面。','逐条补齐权益、门槛、起止时间、领取路径、地区和任务容量；缺项保持待核验。','已过期、强制绑卡自动续费、拉人任务和不足以完成一项任务的小额积分直接排除。'],
  genericQueries,
  vendors:selected.map(vendor=>({id:vendor.id,name:vendor.name,priority:vendor.priority,categories:vendor.categories,opportunityTypes:vendor.opportunityTypes,officialUrls:vendor.officialUrls,queries:productQueries(vendor)}))
};
await writeJson('.runtime/candidates/search-plan.json',plan);

const signatureVersion=2;
function normalizeBody(text){
  const plain=text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g,' ').replace(/\b\d{10,13}\b/g,' ').replace(/\s+/g,' ').trim().slice(0,2_000_000);
  const terms=[...keywords.benefits,...keywords.thresholds,...keywords.valueSignals,'价格','计费','额度','免费','pricing','quota','rate limit','credit','trial'];
  const lowerPlain=plain.toLowerCase(),fragments=[];
  for(const rawTerm of terms){
    const term=String(rawTerm).toLowerCase();let start=0;
    while(fragments.length<240){const index=lowerPlain.indexOf(term,start);if(index<0)break;fragments.push(plain.slice(Math.max(0,index-140),Math.min(plain.length,index+term.length+220)));start=index+term.length;}
    if(fragments.length>=240)break;
  }
  return [...new Set(fragments)].sort().join('\n')||plain.slice(0,12000);
}
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
async function checkPage(vendor,page){
  const key=`${vendor.id}:${page.kind}`;
  const prior=state.pages[key];
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const headers={'user-agent':'ai-free-opportunities-source-map/1.0','accept':'text/html,application/json;q=0.9,*/*;q=0.5'};
    if(prior?.signatureVersion===signatureVersion&&prior?.etag)headers['if-none-match']=prior.etag;
    if(prior?.signatureVersion===signatureVersion&&prior?.lastModified)headers['if-modified-since']=prior.lastModified;
    const response=await fetch(page.url,{headers,redirect:'follow',signal:controller.signal});
    if(response.status===304){
      state.pages[key]={...prior,lastAttemptAt:nowIso,lastSuccessAt:nowIso};
      return {vendorId:vendor.id,vendorName:vendor.name,kind:page.kind,url:page.url,outcome:'not_modified',changed:false};
    }
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const body=await response.text();
    if(!body.trim())throw new Error('空响应');
    const contentHash=hash(normalizeBody(body));
    const hasComparableBaseline=prior?.signatureVersion===signatureVersion&&Boolean(prior?.contentHash);
    const changed=Boolean(hasComparableBaseline&&prior.contentHash!==contentHash);
    state.pages[key]={url:page.url,signatureVersion,contentHash,etag:response.headers.get('etag'),lastModified:response.headers.get('last-modified'),lastAttemptAt:nowIso,lastSuccessAt:nowIso,lastError:null};
    return {vendorId:vendor.id,vendorName:vendor.name,kind:page.kind,url:page.url,outcome:hasComparableBaseline?'ok':'baseline_created',changed,contentHash};
  }catch(error){
    state.pages[key]={...prior,url:page.url,lastAttemptAt:nowIso,lastError:String(error.message??error)};
    return {vendorId:vendor.id,vendorName:vendor.name,kind:page.kind,url:page.url,outcome:'failed',changed:false,error:String(error.message??error),preservedPrior:Boolean(prior?.contentHash)};
  }finally{clearTimeout(timer);}
}

const pageJobs=selected.flatMap(vendor=>vendor.officialUrls.slice(0,bootstrap?2:1).map(page=>({vendor,page})));
const checks=[];
for(let index=0;index<pageJobs.length;index+=6){
  const batch=pageJobs.slice(index,index+6);
  checks.push(...await Promise.all(batch.map(({vendor,page})=>checkPage(vendor,page))));
}
for(const vendor of selected)state.vendors[vendor.id]={lastAttemptAt:nowIso,priority:vendor.priority};
state.updatedAt=nowIso;
await writeJson(statePath,state);
await fs.mkdir('.runtime/reports',{recursive:true});
const report={schemaVersion:'1.0.0',runAt:nowIso,mode:plan.mode,mapSize:sourceMap.items.length,selectedVendors:selected.length,queryCount:genericQueries.length+plan.vendors.reduce((sum,vendor)=>sum+vendor.queries.length,0),officialPagesChecked:checks.length,changedPages:checks.filter(item=>item.changed),failedPages:checks.filter(item=>item.outcome==='failed'),checks};
await writeJson('.runtime/reports/official-page-changes.json',report);
console.log(JSON.stringify({mode:report.mode,mapSize:report.mapSize,selectedVendors:report.selectedVendors,queryCount:report.queryCount,officialPagesChecked:report.officialPagesChecked,changedPages:report.changedPages.length,failedPages:report.failedPages.length},null,2));
