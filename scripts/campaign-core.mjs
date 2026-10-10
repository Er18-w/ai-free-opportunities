import crypto from 'node:crypto';

export const clean=value=>String(value??'')
  .replace(/<[^>]+>/g,' ')
  .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g,token=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[token]??token))
  .replace(/\s+/g,' ').trim();
export const lower=value=>clean(value).toLowerCase();
export const matches=(text,terms=[])=>terms.some(term=>lower(text).includes(lower(term)));
export function matchesBenefit(text,terms=[]){
  const value=lower(text),specific=terms.filter(term=>lower(term)!=='beta');
  return matches(value,specific)||(/\bbeta\b/.test(value)&&/\bfree\b|免费|赠送|额度|会员/.test(value));
}
export function parseDate(value){if(!value)return null;const date=new Date(value);return Number.isNaN(date.valueOf())?null:date;}
export function canonicalUrl(value){
  try{const url=new URL(value);for(const key of [...url.searchParams.keys()])if(/^utm_|^(spm|from|source|ref|referrer|share|share_source)$/i.test(key))url.searchParams.delete(key);url.hash='';if(url.pathname.length>1)url.pathname=url.pathname.replace(/\/$/,'');return url.toString().replace(/\/$/,'');}
  catch{return String(value??'').trim();}
}
const genericTokens=new Set(['免费','限时','活动','福利','领取','体验','模型','会员','token','tokens','free','trial','beta','api']);
export function titleTokens(value){
  const text=lower(value),tokens=text.replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(token=>token.length>1&&!genericTokens.has(token));
  for(const block of text.match(/[\p{Script=Han}]+/gu)??[])for(let i=0;i<block.length-1;i++)tokens.push(block.slice(i,i+2));
  return new Set(tokens);
}
function overlap(a,b){if(!a.size||!b.size)return 0;let same=0;for(const token of a)if(b.has(token))same++;return same/Math.min(a.size,b.size);}
export function likelySameCampaign(a,b){
  if(canonicalUrl(a.sourceUrl)&&canonicalUrl(a.sourceUrl)===canonicalUrl(b.sourceUrl))return true;
  const productA=lower(a.targetProduct),productB=lower(b.targetProduct);if(productA&&productB&&productA!==productB)return false;
  const dateA=a.validUntil??'',dateB=b.validUntil??'';if(dateA&&dateB&&dateA!==dateB)return false;
  return overlap(titleTokens(a.title),titleTokens(b.title))>=0.6;
}
export function discoveryScore({text,source,hasDate=false,hasOfficial=false,keywords}){
  let value=source.tier==='official'?36:source.tier==='aggregator'?20:8;
  if(matches(text,keywords.subjects))value+=12;if(matches(text,keywords.benefits))value+=18;if(matches(text,keywords.valueSignals??[]))value+=14;
  if(matches(text,keywords.thresholds))value+=6;if(hasDate)value+=10;if(hasOfficial)value+=12;
  if(matches(text,keywords.frictionTerms??[]))value-=18;if(matches(text,keywords.riskTerms))value-=80;
  return Math.max(0,Math.min(100,value));
}
export function clusterCandidates(items){
  const clusters=[];
  for(const item of items.sort((a,b)=>b.discoveryScore-a.discoveryScore)){
    let cluster=clusters.find(entry=>entry.items.some(existing=>likelySameCampaign(existing,item)));
    if(!cluster){cluster={id:crypto.createHash('sha256').update(`${lower(item.targetProduct)}|${lower(item.title)}|${item.validUntil??''}`).digest('hex').slice(0,16),items:[]};clusters.push(cluster);}
    cluster.items.push(item);
  }
  return clusters.map(cluster=>{const representative=cluster.items.sort((a,b)=>{const tier={official:3,aggregator:2,community:1};return (tier[b.sourceTier]??0)-(tier[a.sourceTier]??0)||b.discoveryScore-a.discoveryScore;})[0];return {...representative,clusterId:cluster.id,itemCount:cluster.items.length,evidenceCount:new Set(cluster.items.map(item=>item.sourceId)).size,evidence:cluster.items.map(item=>({sourceId:item.sourceId,sourceName:item.sourceName,sourceTier:item.sourceTier,url:item.discoveryUrl??item.sourceUrl,title:item.title,publishedAt:item.publishedAt??item.startAt??null}))};});
}
export function mergeLedger(previous=[],current=[],nowIso=new Date().toISOString()){
  const map=new Map(previous.map(item=>[item.clusterId,{...item,seenThisRun:false}]));
  for(const item of current){const old=map.get(item.clusterId);map.set(item.clusterId,{...old,...item,firstSeenAt:old?.firstSeenAt??nowIso,lastSeenAt:nowIso,seenThisRun:true,status:'candidate'});}
  return [...map.values()].map(item=>({...item,status:item.seenThisRun?'candidate':'not_seen_this_run'})).sort((a,b)=>b.discoveryScore-a.discoveryScore||String(b.lastSeenAt).localeCompare(String(a.lastSeenAt)));
}

