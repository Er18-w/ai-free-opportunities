const state={platforms:[],models:[],offers:[],category:'all'};
const $=selector=>document.querySelector(selector);
const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const categoryNames={all:'综合',general:'通用',coding:'编程',reasoning:'推理',text:'文本',vision:'图像理解',image:'生图',video:'生视频',speech:'语音',retrieval:'知识库检索'};
const accessNames={api:'API',web:'网页',client:'客户端'};
const formatDate=value=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric'}).format(new Date(value));

async function readData(){
  if(globalThis.__AI_OPPORTUNITY_DATA__)return globalThis.__AI_OPPORTUNITY_DATA__;
  const names=['platforms','catalog','offers'];
  const values=await Promise.all(names.map(name=>fetch(`./data/${name}.json`,{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error(`${name}.json 加载失败`);return response.json();})));
  return Object.fromEntries(names.map((name,index)=>[name,values[index]]));
}

function renderPlatforms(){
  $('#platform-list').innerHTML=state.platforms.map(item=>`<article class="board-row platform-row"><div class="rank"><small>NO.</small><b>${item.rankingStatus==='pending'?'—':item.rank}</b></div><div class="row-title"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.summary)}</p><small>${escapeHtml(item.application??'')}</small></div><div class="row-fact"><small>免费量</small><strong>${escapeHtml(item.freeAmount)}</strong></div><div class="row-tags">${item.access.map(value=>`<span>${escapeHtml(value)}</span>`).join('')}<em>${escapeHtml(item.stability)}</em><span>${escapeHtml(item.mainlandAccess)}</span><a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">来源</a></div><a class="go" href="${escapeHtml(item.entryUrl)}" target="_blank" rel="noopener noreferrer">去使用</a></article>`).join('');
}

function categoryRank(item){return state.category==='all'?item.featuredRank:(item.categoryRanks?.[state.category]??999);}
function renderModels(){
  const query=$('#model-query').value.trim().toLowerCase();
  const items=state.models.filter(item=>(state.category==='all'||item.categories.includes(state.category))&&(!query||[item.title,item.provider,item.channel,item.allowance,...item.freeChannels.map(c=>c.provider)].join(' ').toLowerCase().includes(query))).sort((a,b)=>categoryRank(a)-categoryRank(b)||a.featuredRank-b.featuredRank);
  $('#model-empty').hidden=items.length!==0;
  $('#model-list').innerHTML=items.map((item,index)=>{
    const channel=item.freeChannels[0];
    const alternatives=item.freeChannels.slice(1).map(c=>`<a href="${escapeHtml(c.entryUrl)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(c.allowance)}">也可用 ${escapeHtml(c.provider)}</a>`).join('');
    const tags=item.categories.map(value=>`<span>${escapeHtml(categoryNames[value]??value)}</span>`).join('');
    const access=[...new Set(item.freeChannels.flatMap(value=>value.access??[]))].map(value=>`<span>${escapeHtml(accessNames[value]??value)}</span>`).join('');
    return `<article class="board-row model-row"><div class="rank"><small>NO.</small><b>${item.rankingStatus==='pending'?'—':index+1}</b></div><div class="row-title"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.provider)} · ${escapeHtml(item.channel)}</p></div><div class="row-fact"><small>免费方式</small><strong>${escapeHtml(item.allowance)}</strong></div><div class="row-tags">${tags}${access}${alternatives}${item.rankingStatus==='pending'?'<em>新收录 · 名次待评</em>':''}<a href="${escapeHtml(item.officialUrl)}" target="_blank" rel="noopener noreferrer">来源</a></div><a class="go" href="${escapeHtml(channel.entryUrl)}" target="_blank" rel="noopener noreferrer">去使用</a></article>`;
  }).join('');
}

function renderTabs(){
  const used=['all',...Object.keys(categoryNames).filter(value=>value!=='all'&&state.models.some(item=>item.categories.includes(value)))];
  $('#category-tabs').innerHTML=used.map(value=>`<button type="button" role="tab" aria-selected="${value===state.category}" data-category="${value}">${categoryNames[value]}</button>`).join('');
  document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{state.category=button.dataset.category;renderTabs();renderModels();}));
}

function renderOffers(){
  const items=state.offers.filter(item=>item.status==='active').sort((a,b)=>a.freeSourceClass-b.freeSourceClass||a.featuredRank-b.featuredRank);
  $('#offer-list').innerHTML=items.map(item=>`<article class="offer-card"><div class="offer-top"><span>${item.freeSourceClass===2?'免费会员 / 试用':item.freeSourceClass===3?'赠送额度':'免费开放'}</span><small>${escapeHtml(item.provider)}</small></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.allowance)}</p><div class="offer-bottom"><em>${escapeHtml(item.validityText)}</em><a href="${escapeHtml(item.entryUrl)}" target="_blank" rel="noopener noreferrer">查看</a></div></article>`).join('');
}

async function load(){
  const data=await readData();state.platforms=data.platforms.items;state.models=data.catalog.items.filter(item=>item.status==='active');state.offers=data.offers.items;
  $('#platform-count').textContent=state.platforms.length;$('#model-count').textContent=state.models.length;$('#updated-at').textContent=formatDate(data.catalog.updatedAt);
  renderPlatforms();renderTabs();renderModels();renderOffers();$('#model-query').addEventListener('input',renderModels);
}

load().catch(error=>{document.querySelector('main').innerHTML=`<section class="shell error"><h1>资料加载失败</h1><p>${escapeHtml(error.message)}</p></section>`;});
