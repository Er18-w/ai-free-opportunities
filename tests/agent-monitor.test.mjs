import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceLines} from '../scripts/agent-monitor.mjs';
test('Agent 规则抽取排除脚本并保留免费停止与额度限制',()=>{
  const lines=evidenceLines('<script>free unlimited secret</script><p>Free tier discontinued</p><p>50 credits per month</p><p>50 credits per month</p>');
  assert.deepEqual(lines,['Free tier discontinued','50 credits per month']);
});
