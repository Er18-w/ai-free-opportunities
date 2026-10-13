import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceLines,compareEvidence} from '../scripts/agent-monitor.mjs';
test('Agent 规则抽取排除脚本并保留免费停止与额度限制',()=>{
  const lines=evidenceLines('<script>free unlimited secret</script><p>Free tier discontinued</p><p>50 credits per month</p><p>50 credits per month</p>');
  assert.deepEqual(lines,['Free tier discontinued','50 credits per month']);
});
test('首次来源或此前抓取失败建立基线，不读取不存在的旧正文',()=>{
  for(const prior of [undefined,{}, {lastAttemptAt:'2026-10-12'}])assert.deepEqual(compareEvidence(prior,['Free API','10 RPM']),{kind:'baseline',additions:['Free API','10 RPM'],removals:[]});
  assert.deepEqual(compareEvidence({lines:['Free API','20 RPM']},['Free API','10 RPM']),{kind:'rules_changed',additions:['10 RPM'],removals:['20 RPM']});
});
test('价格表保留型号和价格的对应关系并捕捉零价改收费',()=>{
  const before=evidenceLines('<table><tr><td>agnes-video-2.5-flash</td><td>$0 / second</td></tr></table>');
  const after=evidenceLines('<table><tr><td>agnes-video-2.5-flash</td><td>$0.025 / second</td></tr></table>');
  const diff=compareEvidence({lines:before},after);
  assert.match(diff.additions[0],/agnes-video-2.5-flash.*\$0\.025/);
  assert.match(diff.removals[0],/agnes-video-2.5-flash.*\$0 \/ second/);
});
