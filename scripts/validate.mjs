import {readJson} from './lib.mjs';
const catalog=await readJson('data/catalog.json');const campaigns=await readJson('data/campaigns.json');const campaignSources=await readJson('data/campaign-sources.json');const sourceMap=await readJson('data/source-map.json');const sources=await readJson('data/sources.json');const changes=await readJson('data/changes.json');
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
if(sourceMap.items.length<35)errors.push('重点监控对象少于35个');
if(radar.items.length<40)errors.push('完整雷达少于40条，可能丢失交接库存');
const campaignIds=new Set();
for(const item of campaigns.items){
  if(campaignIds.has(item.id))errors.push(`重复活动ID: ${item.id}`);campaignIds.add(item.id);
  for(const key of ['id','targetProduct','title','benefitType','benefit','accessThreshold','claimMethod','validityText','status','evidenceStatus','sourceUrl','entryUrl','riskNotes','lastVerifiedAt'])if(!item[key])errors.push(`${item.id??'未知活动'} 缺少 ${key}`);
  if(!['active','archived'].includes(item.status))errors.push(`${item.id} 活动状态无效`);
  if(!item.sourceUrl.startsWith('https://')||!item.entryUrl.startsWith('https://'))errors.push(`${item.id} 活动URL必须为HTTPS`);
  if(item.status==='active'&&item.validUntil&&new Date(`${item.validUntil}T23:59:59+08:00`)<new Date())errors.push(`${item.id} 已过期却仍为active`);
}
if(!campaignSources.items.some(item=>item.tier==='official')||!campaignSources.items.some(item=>item.tier==='aggregator')||!campaignSources.items.some(item=>item.tier==='community'))errors.push('活动情报源必须覆盖官方、聚合站和社区三层');
for(const item of radar.items)for(const key of ['id','kind','provider','title','categoryLabel','allowance','officialUrl','tier','tierLabel'])if(!item[key])errors.push(`${item.id??'未知雷达记录'} 缺少 ${key}`);
for(const source of sources.items)for(const key of ['id','name','role','url','mode','cadence','status'])if(!source[key])errors.push(`${source.id??'未知来源'} 缺少 ${key}`);
const sourceMapIds=new Set();
for(const item of sourceMap.items){
  if(sourceMapIds.has(item.id))errors.push(`监控地图重复ID: ${item.id}`);sourceMapIds.add(item.id);
  for(const key of ['id','name','region','categories','priority','aliases','opportunityTypes','officialUrls'])if(item[key]===undefined)errors.push(`${item.id??'未知监控对象'} 缺少 ${key}`);
  if(!['A','B','C'].includes(item.priority))errors.push(`${item.id} 优先级无效`);
  if(!Array.isArray(item.officialUrls)||!item.officialUrls.length||item.officialUrls.some(page=>!page.url?.startsWith('https://')))errors.push(`${item.id} 缺少有效官方URL`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(20);}console.log(`验证通过：${campaigns.items.filter(item=>item.status==='active').length} 条当前福利，${catalog.items.length} 条推荐，${radar.items.length} 条雷达记录，${sourceMap.items.length} 个重点监控对象，${sources.items.length} 个长期来源，${campaignSources.items.length} 个活动情报源。`);
