import fs from 'node:fs/promises';
import path from 'node:path';
import {root,readJson,writeJson} from './lib.mjs';
import {reviewState} from '../src/assets/freshness.js';

const now=new Date(),queue=[];
for(const name of ['catalog','offers','platforms']){
  const data=await readJson(`data/${name}.json`);
  for(const item of data.items){
    const state=reviewState(item,now);
    const reasons=[];
    if(state==='expired')reasons.push('已过截止时间，检查下架与关联渠道');
    else if(state==='pending')reasons.push('超过复核周期或证据待补；抓取成功不等于权益已核');
    if(item.reviewStatus)reasons.push(item.reviewStatus);
    if(/未公开|未公布|待核实|以客户端|以模型页/.test(item.allowance??item.freeAmount??''))reasons.push('补免费量/资格或完整任务证据');
    if(reasons.length)queue.push({id:item.id,type:name,name:item.title??item.name,priority:state==='expired'?1:state==='pending'?2:3,reasons,sourceUrl:item.officialUrl??item.sourceUrl,lastVerifiedAt:item.ruleCheckedAt??item.lastVerifiedAt??null});
  }
}
for(const relative of ['.runtime/candidates/agent-changes.json','.runtime/reports/campaign-latest.json']){
  try{const report=await readJson(relative);for(const x of report.changes??report.publicChecks??[]){if(x.kind||['needs_manual_review','unreachable'].includes(x.outcome))queue.push({id:x.id,type:'source_change',priority:2,reason:x.kind??x.outcome,report:relative});}}catch{}
}
queue.sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
const report={generatedAt:now.toISOString(),note:'待审清单，不是自动批准。由维护Agent核实后提交公开数据；不得仅刷新核实日期。',items:queue};
await writeJson('.runtime/reports/review-queue.json',report);
const lines=['# 每日待复核清单','',`生成于 ${report.generatedAt}`,'','按先后处理：已到期 → 规则变化/证据缺失 → 任务容量。每天集中一次，不重复全网搜索。','',...queue.map(x=>`- [${x.priority}] ${x.name??x.id}：${(x.reasons??[x.reason]).join('；')}`),'','操作规范：docs/DAILY_UPDATE.md。没有官方证据不得上新；收费与登录门槛不能代用户绕过。'];
await fs.writeFile(path.join(root,'.runtime/reports/review-queue.md'),lines.join('\n')+'\n');
console.log(`生成 ${queue.length} 项待复核事项；未修改公开数据。`);
