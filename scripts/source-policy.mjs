const day=86400000;
function domain(value){try{const host=new URL(value).hostname.toLowerCase();const parts=host.split('.');return parts.slice(/\.(com|org|net)\.cn$/.test(host)?-3:-2).join('.');}catch{return null;}}

// Discovery can accelerate a configured source; it never adds an arbitrary fetch URL.
export function shouldInspectSource(source,previous={},options={}){
  if(source.status==='stopped')return false;
  const now=options.now??new Date(),last=Date.parse(previous.lastAttemptAt??previous.lastSuccessAt??'');
  if(options.force||!Number.isFinite(last))return true;
  const host=domain(source.machineUrl??source.url);
  const newLead=(options.candidates??[]).some(item=>{
    const first=Date.parse(item.revisionChangedAt??item.firstSeenAt??item.discoveredAt??'');
    return Number.isFinite(first)&&now-first>=0&&now-first<=day&&host&&[item.sourceUrl,item.originalUrl].some(url=>domain(url)===host);
  });
  const cadence=newLead?1:Number(source.cadenceDays??7);
  return now-last>=Math.max(1,cadence)*day;
}

export function resourceLinks(html,sourceUrl){
  const origin=new URL(sourceUrl),items=new Map();
  const safe=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  for(const match of safe.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    let url;try{url=new URL(match[1].replaceAll('&amp;','&'),origin);}catch{continue;}
    if(url.origin!==origin.origin||!/^\/models\/[^/]+\/?$/.test(url.pathname))continue;
    const text=match[2].replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    if(text.length>3)items.set(url.href,{url:url.href,title:text.slice(0,140),summary:text.slice(0,500)});
  }
  return [...items.values()];
}
