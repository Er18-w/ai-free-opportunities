import {readJson,writeJson,sha256} from './lib.mjs';

export function evidenceLines(html){
  const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,'\n').replace(/&nbsp;/g,' ');
  return [...new Set(text.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>3&&/free|quota|credit|model|trial|limit|免费|模型|额度|积分|公测|限时|会员|停止/i.test(x)))].slice(0,250);
}

export async function runAgentMonitor(){
  const sources=await readJson('data/agent-sources.json');
  let previous={items:{}};try{previous=await readJson('.runtime/state/agent-sources.json');}catch{}
  const report={runAt:new Date().toISOString(),sources:[],changes:[],publicDataChanged:false};
  for(let start=0;start<sources.items.length;start+=4){await Promise.all(sources.items.slice(start,start+4).map(async source=>{
    try{
      const response=await fetch(source.url,{signal:AbortSignal.timeout(20000),headers:{'user-agent':'ai-free-opportunities/3.0'}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const lines=evidenceLines(await response.text());
      if(lines.length<3)throw new Error('需浏览器人工核查：有效规则文本不足');
      const hash=sha256(JSON.stringify(lines)),old=previous.items[source.id];
      const additions=old?lines.filter(x=>!old.lines.includes(x)):lines;
      const removals=old?old.lines.filter(x=>!lines.includes(x)):[];
      if(!old||old.hash!==hash)report.changes.push({id:source.id,name:source.name,sourceUrl:source.url,status:'pending',kind:old?'rules_changed':'baseline',additions,removals,checkedAt:report.runAt});
      previous.items[source.id]={hash,lines,lastSuccessAt:report.runAt};
      report.sources.push({id:source.id,outcome:'ok',changed:Boolean(old&&old.hash!==hash)});
    }catch(error){report.sources.push({id:source.id,outcome:'manual_required',error:error.message});}
  }));}
  await writeJson('.runtime/state/agent-sources.json',previous);
  await writeJson('.runtime/candidates/agent-changes.json',report);
  console.log(`Agent 路径核查：${report.sources.length} 个；候选变化 ${report.changes.length} 个；需人工处理 ${report.sources.filter(x=>x.outcome!=='ok').length} 个。`);
  return report;
}
