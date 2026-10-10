import {readJson} from './lib.mjs';
const catalog=await readJson('data/catalog.json');const sources=await readJson('data/sources.json');const changes=await readJson('data/changes.json');
const radar=await readJson('data/radar.json');
const errors=[];const ids=new Set();
if(!catalog.schemaVersion?.startsWith('1.'))errors.push('catalog schemaVersion错误');
for(const item of catalog.items){
  if(ids.has(item.id))errors.push(`重复ID: ${item.id}`);ids.add(item.id);
  for(const key of ['id','title','provider','channel','modelId','summary','valueReason','allowance','capacity','eligibility','evidenceLabel','officialUrl','entryUrl','ruleCheckedAt','status'])if(!item[key])errors.push(`${item.id} 缺少 ${key}`);
  if(item.status!=='active')errors.push(`${item.id} 非active记录不得进入公开catalog`);
  if(!item.officialUrl.startsWith('https://')||!item.entryUrl.startsWith('https://'))errors.push(`${item.id} URL必须为HTTPS`);
  if(!Array.isArray(item.limitations)||!item.limitations.length)errors.push(`${item.id} 缺少限制说明`);
}
if(!Array.isArray(sources.items)||!Array.isArray(changes.items))errors.push('sources/changes格式错误');
if(catalog.items.length<8)errors.push('公开机会少于8条，可能退化为演示数据');
if(sources.items.length<30)errors.push('搜索与核查路径少于30条');
if(radar.items.length<40)errors.push('完整雷达少于40条，可能丢失交接库存');
for(const item of radar.items)for(const key of ['id','kind','provider','title','categoryLabel','allowance','officialUrl','tier','tierLabel'])if(!item[key])errors.push(`${item.id??'未知雷达记录'} 缺少 ${key}`);
for(const source of sources.items)for(const key of ['id','name','role','url','mode','cadence','status'])if(!source[key])errors.push(`${source.id??'未知来源'} 缺少 ${key}`);
if(errors.length){console.error(errors.join('\n'));process.exit(20);}console.log(`验证通过：${catalog.items.length} 条推荐，${radar.items.length} 条雷达记录，${sources.items.length} 个来源。`);
