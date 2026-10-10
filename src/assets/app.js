const state={rankings:[],sources:[],sourceMap:[],changes:[]};
const $=selector=>document.querySelector(selector);
const categoryNames={'text-api':'文本模型 / API','coding-api':'编程模型 / API','coding-agent':'编程 Agent','general-agent':'通用 Agent',image:'图像生成',video:'视频生成',speech:'语音','dev-tools':'开发工具'};
const accessNames={api:'API',web:'网页',client:'客户端'};
const stabilityNames={A:'A · 持续免费',B:'B · 条件免费',C:'C · 限时权益'};
const regionNames={cn_service:'中国版服务',unknown:'地区资格待实测',global:'国际服务'};
const formatDate=value=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'short',day:'numeric'}).format(new Date(value));
const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

async function readData(){
  if(globalThis.__AI_OPPORTUNITY_DATA__)return globalThis.__AI_OPPORTUNITY_DATA__;
  const names=['catalog','campaigns','sources','source-map','changes'];
  const values=await Promise.all(names.map(name=>fetch(`./data/${name}.json`,{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error(`${name}.json 加载失败`);return response.json();})));
  return Object.fromEntries(names.map((name,index)=>[name,values[index]]));
}
function normalizeCatalog(item){
  const tier=item.offerType==='ongoing_free'?'A':item.offerType==='new_user'?'B':'C';
  return {...item,origin:'catalog',stabilityTier:tier,sortHint:item.featuredRank??999,sourceUrl:item.officialUrl,benefit:item.allowance,riskNotes:item.limitations.join('；'),validUntil:null};
}
function normalizeCampaign(item){
  const conditional=/新用户|资源包|免费额度/.test(item.benefitType)&&!/限时|公测/.test(item.benefitType);
  return {id:item.id,title:item.title,provider:item.targetProduct,channel:item.benefitType,modelId:item.benefitType,categories:item.categories,access:item.access,regionStatus:item.regionStatus,origin:'campaign',stabilityTier:conditional?'B':'C',sortHint:item.featuredRank??999,summary:item.benefit,valueReason:item.benefit,allowance:item.benefit,capacity:item.validityText,limitations:[item.riskNotes],eligibility:item.accessThreshold,evidenceLabel:item.evidenceStatus==='official_verified'?'官方活动已核':'官方入口已核',officialUrl:item.sourceUrl,sourceUrl:item.sourceUrl,entryUrl:item.entryUrl,ruleCheckedAt:item.lastVerifiedAt,validUntil:item.validUntil,riskNotes:item.riskNotes,claimMethod:item.claimMethod};
}
function stabilityReason(item){
  if(item.stabilityTier==='A')return '官方持续免费层或固定周期免费额度，适合长期保留。';
  if(item.stabilityTier==='B')return '免费容量够用，但受新用户、地区、账户或有效期条件限制。';
  return item.validUntil?`限时权益，截止 ${item.validUntil}。`:'公测、试用或限时模型，结束时间可能变化。';
}
function rankingSort(a,b){const tier={A:0,B:1,C:2};return tier[a.stabilityTier]-tier[b.stabilityTier]||a.sortHint-b.sortHint||a.provider.localeCompare(b.provider,'zh-CN');}

async function load(){
  const loaded=await readData();const sourceMap=loaded.sourceMap??loaded['source-map'];
  state.rankings=[...loaded.catalog.items.filter(item=>item.status==='active').map(normalizeCatalog),...loaded.campaigns.items.filter(item=>item.status==='active').map(normalizeCampaign)].sort(rankingSort);
  state.sources=loaded.sources.items;state.sourceMap=sourceMap.items;state.changes=loaded.changes.items;
  const categories=new Set(state.rankings.flatMap(item=>item.categories));
  $('#ranking-count').textContent=state.rankings.length;$('#category-count').textContent=categories.size;$('#network-count').textContent=state.sources.length+state.sourceMap.length;$('#updated-at').textContent=formatDate(loaded.campaigns.updatedAt||loaded.catalog.updatedAt);
  bindRanking();bindNetwork();renderRanking();renderNetwork();renderChanges();
}
function bindRanking(){bindQueryValues();$('#filters').addEventListener('input',()=>{syncUrl();renderRanking();});$('#reset').addEventListener('click',()=>{$('#query').value='';$('#category').value='all';$('#access').value='all';syncUrl();renderRanking();});window.addEventListener('popstate',()=>{bindQueryValues();renderRanking();});}
function bindQueryValues(){const params=new URLSearchParams(location.search);$('#query').value=params.get('q')??'';$('#category').value=[...$('#category').options].some(option=>option.value===params.get('category'))?params.get('category'):'all';$('#access').value=[...$('#access').options].some(option=>option.value===params.get('access'))?params.get('access'):'all';}
function syncUrl(){if(location.protocol==='file:')return;const params=new URLSearchParams();if($('#query').value.trim())params.set('q',$('#query').value.trim());if($('#category').value!=='all')params.set('category',$('#category').value);if($('#access').value!=='all')params.set('access',$('#access').value);history.replaceState(null,'',params.size?`?${params}`:location.pathname);}
function renderRanking(){
  const q=$('#query').value.trim().toLowerCase(),category=$('#category').value,access=$('#access').value;
  const items=state.rankings.filter(item=>(!q||[item.title,item.provider,item.modelId,item.summary,item.allowance,...item.categories].join(' ').toLowerCase().includes(q))&&(category==='all'||item.categories.includes(category))&&(access==='all'||item.access.includes(access))).sort(rankingSort);
  const label=category==='all'?'稳定性总榜':categoryNames[category];
  $('#result-count').textContent=`${label} · ${items.length} 条合格机会`;$('#empty').hidden=items.length!==0;
  $('#ranking-list').innerHTML=items.map((item,index)=>rankingTemplate(item,index+1)).join('');
  document.querySelectorAll('[data-details]').forEach(button=>button.addEventListener('click',()=>{const panel=document.getElementById(button.dataset.details);panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));button.textContent=panel.hidden?'查看依据':'收起依据';}));
}
function rankingTemplate(item,rank){
  const panel=`details-${escapeHtml(item.id)}`;
  const urgency=item.origin==='campaign'?`<span class="tag offer">${escapeHtml(item.validUntil?'限时活动':'当前权益')}</span>`:'';
  const api=item.api?`<dt>API 配置</dt><dd><code>${escapeHtml(item.api.baseUrl)} · ${escapeHtml(item.modelId)}</code></dd>`:'';
  return `<article class="rank-card tier-${item.stabilityTier.toLowerCase()}"><div class="rank-number" aria-label="第 ${rank} 名"><small>NO.</small><strong>${rank}</strong></div><div class="rank-main"><div class="card-top"><span class="provider">${escapeHtml(item.provider)} · ${escapeHtml(item.channel)}</span><span class="badge stability">${escapeHtml(stabilityNames[item.stabilityTier])}</span></div><h3>${escapeHtml(item.title)}</h3><div class="model-id">${escapeHtml(item.modelId)}</div><p class="summary">${escapeHtml(item.summary)}</p><div class="allowance">${escapeHtml(item.allowance)}</div><div class="tags">${urgency}${item.categories.map(category=>`<span class="tag">${escapeHtml(categoryNames[category]??category)}</span>`).join('')}${item.access.map(value=>`<span class="tag">${escapeHtml(accessNames[value]??value)}</span>`).join('')}<span class="tag">${escapeHtml(regionNames[item.regionStatus]??item.regionStatus)}</span></div><div class="card-actions"><a class="official" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">官方依据</a><a class="entry" href="${escapeHtml(item.entryUrl)}" target="_blank" rel="noopener noreferrer">开始使用</a><button class="details" type="button" data-details="${panel}" aria-expanded="false">查看依据</button></div><dl class="details-panel" id="${panel}" hidden><dt>稳定性判断</dt><dd>${escapeHtml(stabilityReason(item))}</dd><dt>为什么上榜</dt><dd>${escapeHtml(item.valueReason)}</dd><dt>任务容量 / 有效期</dt><dd>${escapeHtml(item.capacity)}</dd><dt>使用条件</dt><dd>${escapeHtml(item.eligibility)}</dd><dt>主要限制</dt><dd>${item.limitations.map(escapeHtml).join('；')}</dd>${item.claimMethod?`<dt>领取方法</dt><dd>${escapeHtml(item.claimMethod)}</dd>`:''}${api}<dt>最近核查</dt><dd>${escapeHtml(formatDate(item.ruleCheckedAt))} · ${escapeHtml(item.evidenceLabel)}</dd></dl></div></article>`;
}

function bindNetwork(){$('#network-filters').addEventListener('input',renderNetwork);$('#network-reset').addEventListener('click',()=>{$('#network-query').value='';$('#network-kind').value='all';renderNetwork();});}
function networkItems(){
  const targets=state.sourceMap.map(item=>({id:item.id,kind:'target',name:item.name,summary:item.aliases.join(' · '),meta:`${item.priority} 级 · ${item.categories.map(category=>categoryNames[category]??category).join(' / ')}`,url:item.officialUrls[0].url}));
  const routes=state.sources.map(item=>({id:item.id,kind:'route',name:item.name,summary:item.role,meta:`${item.cadence} · ${item.mode}`,url:item.url}));
  return [...targets,...routes];
}
function renderNetwork(){
  const q=$('#network-query').value.trim().toLowerCase(),kind=$('#network-kind').value;
  const all=networkItems(),items=all.filter(item=>(kind==='all'||item.kind===kind)&&(!q||[item.name,item.summary,item.meta].join(' ').toLowerCase().includes(q)));
  $('#network-result-count').textContent=`显示 ${items.length} / ${all.length} 个来源节点`;
  $('#network-list').innerHTML=items.map(item=>`<a class="network-item" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"><span class="network-kind kind-${item.kind}">${item.kind==='target'?'监控对象':'核查路径'}</span><span class="network-copy"><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.summary)}</small></span><em>${escapeHtml(item.meta)}</em></a>`).join('');
}
function renderChanges(){$('#change-list').innerHTML=state.changes.map(item=>`<article><time datetime="${escapeHtml(item.date)}">${escapeHtml(item.date)}</time><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p></article>`).join('');}
load().catch(error=>{$('#ranking-list').innerHTML=`<div class="empty"><h3>资料加载失败</h3><p>${escapeHtml(error.message)}。如果你直接打开普通 index.html，请改用 standalone.html。</p></div>`;$('#result-count').textContent='暂时无法显示';});
