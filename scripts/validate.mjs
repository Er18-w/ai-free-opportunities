import {readJson} from './lib.mjs';
const catalog=await readJson('data/catalog.json');const sources=await readJson('data/sources.json');const changes=await readJson('data/changes.json');
const errors=[];const ids=new Set();
if(catalog.schemaVersion!=='1.0.0')errors.push('catalog schemaVersion错误');
for(const item of catalog.items){
  if(ids.has(item.id))errors.push(`重复ID: ${item.id}`);ids.add(item.id);
  for(const key of ['id','title','provider','channel','modelId','summary','valueReason','allowance','capacity','eligibility','evidenceLabel','officialUrl','entryUrl','ruleCheckedAt','status'])if(!item[key])errors.push(`${item.id} 缺少 ${key}`);
  if(item.status!=='active')errors.push(`${item.id} 非active记录不得进入公开catalog`);
  if(!item.officialUrl.startsWith('https://')||!item.entryUrl.startsWith('https://'))errors.push(`${item.id} URL必须为HTTPS`);
  if(!Array.isArray(item.limitations)||!item.limitations.length)errors.push(`${item.id} 缺少限制说明`);
}
if(!Array.isArray(sources.items)||!Array.isArray(changes.items))errors.push('sources/changes格式错误');
if(errors.length){console.error(errors.join('\n'));process.exit(20);}console.log(`验证通过：${catalog.items.length} 条公开机会，${sources.items.length} 个来源。`);
