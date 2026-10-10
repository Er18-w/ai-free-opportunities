import fs from 'node:fs/promises';
import path from 'node:path';
import {root,readJson,writeJson,sha256} from './lib.mjs';

const now=new Date();
const nowIso=now.toISOString();
const forceAll=process.env.FORCE_ALL_SOURCES==='1';
const report={runAt:nowIso,forceAll,sources:[],publicDataChanged:false,candidateCount:0,warnings:[]};
const sources=await readJson('data/sources.json');
const cadenceDays={daily:1,weekly:6,monthly:27};

function due(source){
  if(source.status==='stopped')return false;
  if(forceAll||!source.lastAttemptAt)return true;
  return now-new Date(source.lastAttemptAt)>=cadenceDays[source.cadence]*86400000;
}
async function fetchText(url,userAgent='ai-free-opportunities/1.2 (+https://github.com/Er18-w/ai-free-opportunities)'){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(url,{headers:{'user-agent':userAgent,'accept':'text/html,application/json;q=0.9,*/*;q=0.8'},signal:controller.signal,redirect:'follow'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const text=await response.text();
    if(!text.trim())throw new Error('空响应');
    if(text.length>5*1024*1024)throw new Error('响应超过5MB');
    return text;
  }finally{clearTimeout(timer);}
}
async function saveCandidate(name,source,note,items){
  items.sort((a,b)=>a.id.localeCompare(b.id));
  await writeJson(`.runtime/candidates/${name}.json`,{schemaVersion:'1.0.0',generatedAt:nowIso,sourceId:source.id,note,items});
  report.candidateCount+=items.length;
  return items.length;
}
async function inspect(source){
  if(!due(source)){report.sources.push({id:source.id,outcome:'not_due'});return;}
  source.lastAttemptAt=nowIso;
  try{
    const text=await fetchText(source.machineUrl??source.url);
    let candidates=0;
    if(source.id==='S01'){
      const payload=JSON.parse(text);if(!Array.isArray(payload.data))throw new Error('目录缺少 data 数组');
      const items=payload.data.filter(model=>{const p=model.pricing??{};return p.prompt==='0'&&p.completion==='0';}).map(model=>({id:model.id,name:model.name,contextLength:model.context_length??null,pricing:model.pricing,discoveredAt:nowIso,sourceUrl:source.url,status:'pending'}));
      candidates=await saveCandidate('openrouter-free',source,'自动发现候选；需核对共享额度、任务容量和使用成本后才能公开。',items);
    }else if(source.id==='S03'){
      const payload=JSON.parse(text);const models=Array.isArray(payload.data)?payload.data:Array.isArray(payload)?payload:[];
      const items=models.filter(model=>String(model.id??'').endsWith('-free')).map(model=>({id:model.id,name:model.name??model.id,discoveredAt:nowIso,sourceUrl:source.url,machineUrl:source.machineUrl,status:'pending'}));
      candidates=await saveCandidate('opencode-zen-free',source,'限免型号候选；必须再核对开户条件、容量、隐私与有效期，不能自动公开。',items);
    }else if(source.id==='S19'){
      const apiUrl='https://aihot.news/api/v1/items?mode=all&window=7d&limit=100&q='+encodeURIComponent('免费');
      const payload=JSON.parse(await fetchText(apiUrl,'aihot-api/2.0.0'));
      const seen=new Set();
      const items=(payload.items??[]).filter(item=>/免费|限时|试用|额度|赠送|credits?|free\s*(tier|access|trial)/i.test(item.title??'')).filter(item=>{if(seen.has(item.id))return false;seen.add(item.id);return true;}).map(item=>({id:item.id,title:item.title,publishedAt:item.publishedAt??null,sourceName:item.source?.name??null,originalUrl:item.links?.original??null,discoveryUrl:item.links?.aihot??null,discoveredAt:nowIso,status:'pending'}));
      candidates=await saveCandidate('aihot-opportunities',source,'AIHOT 仅作为内部发现源。不得公开镜像其内容；每条线索必须回到厂商官方来源核实免费条件、容量和期限。',items);
    }
    source.lastSuccessAt=nowIso;source.health='ok';source.lastError=null;
    report.sources.push({id:source.id,outcome:'ok',...(candidates?{candidates}:{})});
  }catch(error){
    source.lastError=String(error.message??error);
    source.health=/HTTP (401|403|429)/.test(source.lastError)?'blocked':'failed';
    report.sources.push({id:source.id,outcome:source.health,error:source.lastError});
    report.warnings.push(`${source.id} ${source.name}: ${source.lastError}；保留上次有效公开数据。`);
  }
}

const queue=sources.items.filter(source=>source.status!=='stopped');
for(let i=0;i<queue.length;i+=5)await Promise.all(queue.slice(i,i+5).map(inspect));
for(const source of sources.items.filter(source=>source.status==='stopped'))report.sources.push({id:source.id,outcome:'stopped'});
await writeJson('data/sources.json',sources);
await fs.mkdir(path.join(root,'.runtime/reports'),{recursive:true});
await fs.writeFile(path.join(root,'.runtime/reports','latest.json'),JSON.stringify({...report,reportHash:sha256(JSON.stringify(report))},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
const attempted=report.sources.filter(source=>!['not_due','stopped'].includes(source.outcome));
if(attempted.length&&!attempted.some(source=>source.outcome==='ok'))process.exitCode=10;
