const state={catalog:[],sources:[],changes:[]};
const $=selector=>document.querySelector(selector);
const categoryNames={'text-api':'文本 API','coding-api':'编程 API','coding-agent':'编程 Agent','general-agent':'通用 Agent',image:'生图',video:'视频',speech:'语音','dev-tools':'开发工具'};
const formatDate=value=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'short',day:'numeric'}).format(new Date(value));
const escapeHtml=value=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

async function load(){
  const [catalog,sources,changes]=await Promise.all(['catalog.json','sources.json','changes.json'].map(name=>fetch(`./data/${name}`,{cache:'no-cache'}).then(response=>{if(!response.ok)throw new Error(`${name} 加载失败`);return response.json();})));
  state.catalog=catalog.items.filter(item=>item.status==='active').sort((a,b)=>(a.featuredRank??999)-(b.featuredRank??999)||a.id.localeCompare(b.id));
  state.sources=sources.items;
  state.changes=changes.items;
  $('#resource-count').textContent=state.catalog.length;
  $('#source-count').textContent=state.sources.filter(source=>source.status==='enabled').length;
  $('#updated-at').textContent=formatDate(catalog.updatedAt);
  bindQuery();render();renderChanges();
}

function bindQuery(){
  const params=new URLSearchParams(location.search);
  $('#query').value=params.get('q')??'';
  $('#category').value=[...$('#category').options].some(o=>o.value===params.get('category'))?params.get('category'):'all';
  $('#access').value=[...$('#access').options].some(o=>o.value===params.get('access'))?params.get('access'):'all';
  $('#filters').addEventListener('input',()=>{syncUrl();render();});
  $('#reset').addEventListener('click',()=>{$('#query').value='';$('#category').value='all';$('#access').value='all';syncUrl();render();});
  window.addEventListener('popstate',()=>{bindQueryValues();render();});
}
function bindQueryValues(){const params=new URLSearchParams(location.search);$('#query').value=params.get('q')??'';$('#category').value=params.get('category')??'all';$('#access').value=params.get('access')??'all';}
function syncUrl(){const params=new URLSearchParams();if($('#query').value.trim())params.set('q',$('#query').value.trim());if($('#category').value!=='all')params.set('category',$('#category').value);if($('#access').value!=='all')params.set('access',$('#access').value);history.replaceState(null,'',params.size?`?${params}`:location.pathname);}
function render(){
  const q=$('#query').value.trim().toLowerCase(),category=$('#category').value,access=$('#access').value;
  const items=state.catalog.filter(item=>(!q||[item.title,item.provider,item.modelId,item.summary,...item.categories].join(' ').toLowerCase().includes(q))&&(category==='all'||item.categories.includes(category))&&(access==='all'||item.access.includes(access)));
  $('#result-count').textContent=`找到 ${items.length} 条合格机会`;
  $('#empty').hidden=items.length!==0;
  $('#cards').innerHTML=items.map(cardTemplate).join('');
  document.querySelectorAll('[data-details]').forEach(button=>button.addEventListener('click',()=>{const panel=document.getElementById(button.dataset.details);panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));button.textContent=panel.hidden?'查看详情':'收起详情';}));
}
function cardTemplate(item){const panel=`details-${escapeHtml(item.id)}`;return `<article class="card"><div class="card-top"><span class="provider">${escapeHtml(item.provider)} · ${escapeHtml(item.channel)}</span><span class="badge">${escapeHtml(item.evidenceLabel)}</span></div><h3>${escapeHtml(item.title)}</h3><div class="model-id">${escapeHtml(item.modelId)}</div><p class="summary">${escapeHtml(item.summary)}</p><div class="allowance">${escapeHtml(item.allowance)}</div><div class="tags">${item.categories.map(c=>`<span class="tag">${escapeHtml(categoryNames[c]??c)}</span>`).join('')}<span class="tag">地区资格未核实</span></div><div class="card-actions"><a class="official" href="${escapeHtml(item.officialUrl)}" target="_blank" rel="noopener noreferrer">查看官方规则</a><button class="details" type="button" data-details="${panel}" aria-expanded="false">查看详情</button></div><dl class="details-panel" id="${panel}" hidden><dt>为什么收录</dt><dd>${escapeHtml(item.valueReason)}</dd><dt>任务容量</dt><dd>${escapeHtml(item.capacity)}</dd><dt>领取/使用条件</dt><dd>${escapeHtml(item.eligibility)}</dd><dt>主要限制</dt><dd>${item.limitations.map(escapeHtml).join('；')}</dd><dt>API 配置</dt><dd><code>${escapeHtml(item.api.baseUrl)} · ${escapeHtml(item.modelId)}</code></dd><dt>规则核查日期</dt><dd>${escapeHtml(formatDate(item.ruleCheckedAt))}</dd></dl></article>`;}
function renderChanges(){$('#change-list').innerHTML=state.changes.map(item=>`<article><time datetime="${escapeHtml(item.date)}">${escapeHtml(item.date)}</time><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p></article>`).join('');}
load().catch(error=>{$('#cards').innerHTML=`<div class="empty"><h3>资料加载失败</h3><p>${escapeHtml(error.message)}，请稍后重试。</p></div>`;$('#result-count').textContent='暂时无法显示';});
