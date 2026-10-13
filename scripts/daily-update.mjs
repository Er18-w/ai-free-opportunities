import fs from 'node:fs/promises';
import path from 'node:path';
import {root,readJson,writeJson,sha256} from './lib.mjs';

const now=new Date(),nowIso=now.toISOString();
const forceAll=process.env.FORCE_ALL_SOURCES==='1';
const bootstrap=process.argv.includes('--bootstrap');
const discoveryStart=process.env.DISCOVERY_START||'2026-06-01';
const report={runAt:nowIso,forceAll,bootstrap,discoveryStart,sources:[],modelSources:[],publicDataChanged:false,candidateCount:0,warnings:[],backfillNotes:[]};
const [sources,modelSources]=await Promise.all([readJson('data/sources.json'),readJson('data/model-sources.json')]);
const cadenceDays={daily:1,weekly:6,monthly:27};

function due(source){if(source.status==='stopped')return false;if(forceAll||bootstrap||!source.lastAttemptAt)return true;return now-new Date(source.lastAttemptAt)>=cadenceDays[source.cadence]*86400000;}
async function fetchText(url,userAgent='ai-free-opportunities/2.0 (+https://github.com/Er18-w/ai-free-opportunities)'){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  try{const response=await fetch(url,{headers:{'user-agent':userAgent,'accept':'text/markdown,text/html,application/json;q=0.9,*/*;q=0.8'},signal:controller.signal,redirect:'follow'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const text=await response.text();if(!text.trim())throw new Error('空响应');if(text.length>8*1024*1024)throw new Error('响应超过8MB');return text;}finally{clearTimeout(timer);}
}
async function saveCandidate(name,source,note,items){items.sort((a,b)=>a.id.localeCompare(b.id));await writeJson(`.runtime/candidates/${name}.json`,{schemaVersion:'2.0.0',generatedAt:nowIso,sourceId:source.id,note,items});report.candidateCount+=items.length;return items.length;}
function cleanMatch(value){return value.replace(/<[^>]+>/g,'').replace(/["'`,;)}\]]+$/g,'').trim();}
function parseModelSource(source,text){
  if(source.mode==='json_data'){
    const payload=JSON.parse(text),items=Array.isArray(payload.data)?payload.data:Array.isArray(payload)?payload:[];
    return items.map(model=>({id:String(model.id??model.name),name:String(model.name??model.id),sourceUrl:source.documentationUrl??source.url,machineUrl:source.url,status:'pending',discoveredAt:nowIso})).filter(item=>item.id&&item.id!=='undefined');
  }
  const found=new Set();for(const pattern of source.patterns??[]){const regex=new RegExp(pattern,'gi');for(const match of text.matchAll(regex)){const value=cleanMatch(match[0]);if(value.length>=3&&value.length<=100)found.add(value);}}
  return [...found].map(value=>({id:value,name:value,sourceUrl:source.url,status:'pending',discoveredAt:nowIso}));
}
async function inspectModelSource(source){
  if(source.mode==='manual_js'){
    try{
      await fetchText(source.url);
      await saveCandidate(`models-${source.id.toLowerCase()}`,source,`该官方模型页需要人工核查：${source.manualReason}`,[]);
      report.modelSources.push({id:source.id,name:source.name,url:source.url,outcome:'manual_required',reason:source.manualReason});
      report.warnings.push(`${source.id} ${source.name}: ${source.manualReason}`);
    }catch(error){
      report.modelSources.push({id:source.id,name:source.name,url:source.url,outcome:/HTTP (401|403|429)/.test(String(error.message))?'blocked':'failed',error:String(error.message??error),reason:source.manualReason});
      report.warnings.push(`${source.id} ${source.name}: ${error.message}；${source.manualReason}`);
    }
    return;
  }
  try{const text=await fetchText(source.url);const items=parseModelSource(source,text);await saveCandidate(`models-${source.id.toLowerCase()}`,source,'模型清单候选；仍需结合免费条件、任务容量和地区资格核验，不能自动公开。',items);report.modelSources.push({id:source.id,name:source.name,url:source.url,outcome:'ok',candidates:items.length});}
  catch(error){report.modelSources.push({id:source.id,name:source.name,url:source.url,outcome:/HTTP (401|403|429)/.test(String(error.message))?'blocked':'failed',error:String(error.message??error)});report.warnings.push(`${source.id} ${source.name}: ${error.message}；转人工核查，不删除上次候选。`);}
}
async function inspect(source){
  if(!due(source)){report.sources.push({id:source.id,outcome:'not_due'});return;}source.lastAttemptAt=nowIso;
  try{
    const text=await fetchText(source.machineUrl??source.url);let candidates=0;
    if(source.id==='S01'){
      const payload=JSON.parse(text);if(!Array.isArray(payload.data))throw new Error('目录缺少 data 数组');
      const items=payload.data.filter(model=>{const p=model.pricing??{};return p.prompt==='0'&&p.completion==='0';}).map(model=>({id:model.id,name:model.name,contextLength:model.context_length??null,pricing:model.pricing,discoveredAt:nowIso,sourceUrl:source.url,status:'pending'}));
      candidates=await saveCandidate('openrouter-free',source,'自动发现候选；需核对共享额度、任务容量和使用成本后才能公开。',items);
    }else if(source.id==='S03'){
      const payload=JSON.parse(text),models=Array.isArray(payload.data)?payload.data:Array.isArray(payload)?payload:[];
      const items=models.filter(model=>String(model.id??'').endsWith('-free')).map(model=>({id:model.id,name:model.name??model.id,discoveredAt:nowIso,sourceUrl:source.url,machineUrl:source.machineUrl,status:'pending'}));
      candidates=await saveCandidate('opencode-zen-free',source,'限免型号候选；必须再核对开户条件、容量、隐私与有效期，不能自动公开。',items);
    }else if(source.id==='S19'){
      const apiUrl='https://aihot.news/api/v1/items?mode=all&window=7d&limit=100&q='+encodeURIComponent('免费');
      if(bootstrap)report.backfillNotes.push('AIHOT API 的 window 仅支持 24h 或 7d，不能直接回溯到 2026-06-01；首扫改走关键词搜索与原始来源。');
      const payload=JSON.parse(await fetchText(apiUrl,'aihot-api/2.0.0')),seen=new Set();
      const items=(payload.items??[]).filter(item=>/免费|限时|试用|额度|赠送|credits?|free\s*(tier|access|trial)/i.test(item.title??'')).filter(item=>{if(seen.has(item.id))return false;seen.add(item.id);return true;}).map(item=>({id:item.id,title:item.title,publishedAt:item.publishedAt??null,sourceName:item.source?.name??null,originalUrl:item.links?.original??null,discoveryUrl:item.links?.aihot??null,discoveredAt:nowIso,status:'pending'}));
      candidates=await saveCandidate('aihot-opportunities',source,'AIHOT 只作内部发现；API 不能回溯超过 7 天。每条线索必须回到厂商官方来源核实。',items);
    }
    source.lastSuccessAt=nowIso;source.health='ok';source.lastError=null;report.sources.push({id:source.id,outcome:'ok',...(candidates?{candidates}:{})});
  }catch(error){source.lastError=String(error.message??error);source.health=/HTTP (401|403|429)/.test(source.lastError)?'blocked':'failed';report.sources.push({id:source.id,outcome:source.health,error:source.lastError});report.warnings.push(`${source.id} ${source.name}: ${source.lastError}；保留上次有效公开数据。`);}
}

const queue=sources.items.filter(source=>source.status!=='stopped');for(let i=0;i<queue.length;i+=5)await Promise.all(queue.slice(i,i+5).map(inspect));
for(const source of sources.items.filter(source=>source.status==='stopped'))report.sources.push({id:source.id,outcome:'stopped'});
const modelQueue=modelSources.items.filter(source=>source.status==='active');for(let i=0;i<modelQueue.length;i+=4)await Promise.all(modelQueue.slice(i,i+4).map(inspectModelSource));
await writeJson('data/sources.json',sources);await fs.mkdir(path.join(root,'.runtime/reports'),{recursive:true});
await fs.writeFile(path.join(root,'.runtime/reports',bootstrap?'bootstrap-latest.json':'latest.json'),JSON.stringify({...report,reportHash:sha256(JSON.stringify(report))},null,2)+'\n');
console.log(JSON.stringify(report,null,2));
const attempted=report.sources.filter(source=>!['not_due','stopped'].includes(source.outcome));if(attempted.length&&!attempted.some(source=>source.outcome==='ok'))process.exitCode=10;

