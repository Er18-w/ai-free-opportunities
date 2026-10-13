import fs from 'node:fs/promises';
import {readJson} from './lib.mjs';

const [platforms,catalog,offers,campaignSources,sourceMap,modelSources,sources,changes]=await Promise.all([
  readJson('data/platforms.json'),readJson('data/catalog.json'),readJson('data/offers.json'),readJson('data/campaign-sources.json'),readJson('data/source-map.json'),readJson('data/model-sources.json'),readJson('data/sources.json'),readJson('data/changes.json')
]);
const errors=[],ids=new Set(),tierRanks=new Map(),rankedEvidence=[];
const validTiers=new Set(['A','B','C']),validClasses=new Set([1,2,3]),validRegions=new Set(['cn_service','global','unknown']);
const validDate=value=>/^\d{4}-\d{2}-\d{2}/.test(value)&&!Number.isNaN(Date.parse(value));
if(!catalog.schemaVersion?.startsWith('2.'))errors.push('catalog schemaVersion 必须为 2.x');
for(const item of catalog.items){
  if(ids.has(item.id))errors.push(`重复ID: ${item.id}`);ids.add(item.id);
  for(const key of ['id','title','provider','channel','modelId','summary','valueReason','allowance','capacity','eligibility','evidenceLabel','officialUrl','entryUrl','ruleCheckedAt','status','stabilityTier','freeSourceClass','featuredRank'])if(item[key]===undefined||item[key]===null||item[key]==='')errors.push(`${item.id} 缺少 ${key}`);
  if(item.status!=='active')errors.push(`${item.id} 非 active 记录不得进入公开模型清单`);
  if(!validTiers.has(item.stabilityTier))errors.push(`${item.id} stabilityTier 无效`);
  if(!validClasses.has(item.freeSourceClass))errors.push(`${item.id} freeSourceClass 无效或出现第4类`);
  if(!Array.isArray(item.categories)||!item.categories.length)errors.push(`${item.id} 缺少任务类型`);
  if(!Array.isArray(item.freeChannels)||!item.freeChannels.length)errors.push(`${item.id} 缺少免费通道`);
  if(!Array.isArray(item.limitations)||!item.limitations.length)errors.push(`${item.id} 缺少限制说明`);
  if(!item.officialUrl.startsWith('https://')||!item.entryUrl.startsWith('https://'))errors.push(`${item.id} URL 必须为 HTTPS`);
  const rankKey=`${item.stabilityTier}:${item.featuredRank}`;if(tierRanks.has(rankKey))errors.push(`${item.id} 与 ${tierRanks.get(rankKey)} 同档 featuredRank 重复`);else tierRanks.set(rankKey,item.id);
  for(const channel of item.freeChannels){
    if(!validClasses.has(channel.class))errors.push(`${item.id} 免费通道 class 无效`);
    if(!validRegions.has(channel.regionStatus))errors.push(`${item.id} 免费通道地区无效`);
    if(!channel.sourceUrl?.startsWith('https://')||!channel.entryUrl?.startsWith('https://'))errors.push(`${item.id} 免费通道 URL 无效`);
  }
  const evidence=item.capabilityEvidence;
  if(evidence!==null){
    for(const key of ['benchmark','version','metric','value','asOf','url','confidence','appliesTo','higherIsBetter'])if(evidence[key]===undefined||evidence[key]===null||evidence[key]==='')errors.push(`${item.id} capabilityEvidence 缺少 ${key}`);
    if(typeof evidence.value!=='number'||!Number.isFinite(evidence.value))errors.push(`${item.id} capabilityEvidence.value 必须为数字`);
    if(!evidence.url?.startsWith('https://'))errors.push(`${item.id} capabilityEvidence.url 必须为 HTTPS`);
    if(!validDate(evidence.asOf))errors.push(`${item.id} capabilityEvidence.asOf 日期无效`);
    if(!item.categories.includes(evidence.appliesTo))errors.push(`${item.id} capabilityEvidence.appliesTo 不在任务类型中`);
    if(item.rankingStatus!=='ranked')errors.push(`${item.id} 有能力依据但 rankingStatus 不是 ranked`);
    const categoryRank=item.categoryRanks?.[evidence.appliesTo];
    if(!Number.isInteger(categoryRank)||categoryRank<1)errors.push(`${item.id} 缺少可复算的能力名次`);
    rankedEvidence.push({item,evidence,categoryRank});
  }else if(item.rankingStatus==='ranked'){
    errors.push(`${item.id} 标为 ranked 但没有能力依据`);
  }
}
for(const category of new Set(rankedEvidence.map(x=>x.evidence.appliesTo))){
  const group=rankedEvidence.filter(x=>x.evidence.appliesTo===category).sort((a,b)=>a.categoryRank-b.categoryRank);
  const signature=new Set(group.map(x=>`${x.evidence.benchmark}|${x.evidence.version}|${x.evidence.metric}|${x.evidence.higherIsBetter}`));
  if(signature.size!==1)errors.push(`${category} 能力榜混入不可直接比较的基准`);
  group.forEach((entry,index)=>{if(entry.categoryRank!==index+1)errors.push(`${category} 能力名次不连续`);if(index&&((entry.evidence.higherIsBetter&&group[index-1].evidence.value<entry.evidence.value)||(!entry.evidence.higherIsBetter&&group[index-1].evidence.value>entry.evidence.value)))errors.push(`${category} 能力名次与分数不一致`);});
}
if(catalog.items.length<10)errors.push('公开模型少于10个，可能发生数据退化');
const platformIds=new Set(),platformRanks=new Set();
for(const item of platforms.items){
  if(platformIds.has(item.id))errors.push(`重复平台ID: ${item.id}`);platformIds.add(item.id);
  if(platformRanks.has(item.rank))errors.push(`重复平台名次: ${item.rank}`);platformRanks.add(item.rank);
  for(const key of ['id','rank','name','summary','freeAmount','access','mainlandAccess','stability','evidenceStatus','sourceUrl','entryUrl'])if(item[key]===undefined||item[key]===null||item[key]==='')errors.push(`${item.id??'未知平台'} 缺少 ${key}`);
  if(!Array.isArray(item.access)||!item.access.length||!Array.isArray(item.models)||!item.models.length)errors.push(`${item.id} 平台数组字段错误`);
  if(!item.sourceUrl?.startsWith('https://')||!item.entryUrl?.startsWith('https://'))errors.push(`${item.id} 平台 URL 必须为 HTTPS`);
}
if(platforms.items.length<8)errors.push('公开平台少于8个，可能发生数据退化');
const offerIds=new Set(),classRanks=new Map();
for(const item of offers.items){
  if(offerIds.has(item.id)||ids.has(item.id))errors.push(`重复机会ID: ${item.id}`);offerIds.add(item.id);
  for(const key of ['id','title','provider','productType','freeSourceClass','stabilityTier','categories','access','regionStatus','summary','benefit','allowance','capacity','eligibility','claimMethod','limitations','evidenceLabel','evidenceStatus','sourceUrl','entryUrl','validityText','lastVerifiedAt','status','models','featuredRank'])if(item[key]===undefined||item[key]===null||item[key]==='')errors.push(`${item.id??'未知机会'} 缺少 ${key}`);
  if(!validClasses.has(item.freeSourceClass))errors.push(`${item.id} 机会 class 无效或出现第4类`);
  if(!validTiers.has(item.stabilityTier))errors.push(`${item.id} 机会 stabilityTier 无效`);
  if(!validRegions.has(item.regionStatus))errors.push(`${item.id} 机会地区无效`);
  if(!Array.isArray(item.limitations)||!item.limitations.length||!Array.isArray(item.models))errors.push(`${item.id} 机会数组字段错误`);
  if(!item.sourceUrl.startsWith('https://')||!item.entryUrl.startsWith('https://'))errors.push(`${item.id} 机会 URL 必须为 HTTPS`);
  if(item.status==='active'&&item.validUntil&&new Date(`${item.validUntil}T23:59:59+08:00`)<new Date())errors.push(`${item.id} 已过期却仍为 active`);
  const rankKey=`${item.freeSourceClass}:${item.featuredRank}`;if(classRanks.has(rankKey))errors.push(`${item.id} 与 ${classRanks.get(rankKey)} 同类 featuredRank 重复`);else classRanks.set(rankKey,item.id);
}
if(offers.items.some(item=>item.id==='doubao-work-30-day-subscription'&&item.sourceUrl==='https://www.doubao.com/legal/ey01'))errors.push('付费协议不能证明豆包赠送活动');
if(!catalog.items.some(item=>/opencode-zen/.test(item.id)))errors.push('OpenCode Zen 模型缺失');
if(!catalog.items.some(item=>/workbuddy|hunyuan/.test(item.id)))errors.push('WorkBuddy / 混元模型缺失');
if(!Array.isArray(sources.items)||!Array.isArray(changes.items))errors.push('sources/changes 格式错误');
if(sources.items.length<30)errors.push('搜索与核查路径少于30条');
if(sourceMap.items.length<43)errors.push(`重点监控对象少于已有43个，当前 ${sourceMap.items.length}`);
if(modelSources.items.length<8)errors.push(`模型清单源少于已有8个，当前 ${modelSources.items.length}`);
for(const [name,data] of [['source-map',sourceMap],['model-sources',modelSources]])if(new Set(data.items.map(x=>x.id)).size!==data.items.length)errors.push(`${name} 存在重复来源ID`);
for(const source of modelSources.items)if(!sourceMap.items.some(v=>v.id===source.vendorId))errors.push(`${source.id} 缺少对应监控对象`);
for(const source of modelSources.items){if(!source.url?.startsWith('https://'))errors.push(`${source.id} 模型清单 URL 无效`);if(source.mode==='manual_js'&&!source.manualReason)errors.push(`${source.id} 人工清单源缺少原因`);}
if(!campaignSources.items.some(item=>item.tier==='official')||!campaignSources.items.some(item=>item.tier==='aggregator')||!campaignSources.items.some(item=>item.tier==='community'))errors.push('活动情报源必须覆盖官方、聚合站和社区三层');
for(const source of sources.items)for(const key of ['id','name','role','url','mode','cadence','status'])if(!source[key])errors.push(`${source.id??'未知来源'} 缺少 ${key}`);
const sourceMapIds=new Set();for(const item of sourceMap.items){if(sourceMapIds.has(item.id))errors.push(`监控地图重复ID: ${item.id}`);sourceMapIds.add(item.id);if(!Array.isArray(item.officialUrls)||!item.officialUrls.length||item.officialUrls.some(page=>!page.url?.startsWith('https://')))errors.push(`${item.id} 缺少有效官方 URL`);}
try{await fs.access('data/radar.json');errors.push('data/radar.json 已获授权删除但仍存在');}catch{}
if(errors.length){console.error(errors.join('\n'));process.exit(20);}
console.log(`验证通过：平台 ${platforms.items.length} 个，模型 ${catalog.items.length} 个，免费机会 ${offers.items.filter(item=>item.status==='active').length} 个。`);
