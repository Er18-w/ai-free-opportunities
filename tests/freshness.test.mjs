import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewState} from '../src/assets/freshness.js';
const now=new Date('2026-10-13T12:00:00Z');
test('无截止活动48小时后待复核，不会因网页可达而续期',()=>{
  assert.equal(reviewState({sourceKind:'offer',lastVerifiedAt:'2026-10-11T11:59:59Z',lastSuccessAt:now.toISOString()},now),'pending');
  assert.equal(reviewState({sourceKind:'offer',lastVerifiedAt:'2026-10-13T10:00:00Z'},now),'current');
});
test('截止日使用中国时区，不把当天提前下架',()=>{
  const item={validUntil:'2026-10-13',lastVerifiedAt:now.toISOString()};
  assert.equal(reviewState(item,new Date('2026-10-13T15:59:59Z')),'current');
  assert.equal(reviewState(item,new Date('2026-10-13T16:00:00Z')),'expired');
});
test('普通规则按周复核，缺失或伪造未来日期不算已核',()=>{
  assert.equal(reviewState({ruleCheckedAt:'2026-10-10T12:00:00Z'},now),'current');
  for(const date of [undefined,'invalid','2026-11-01T00:00:00Z'])assert.equal(reviewState({ruleCheckedAt:date},now),'pending');
  assert.equal(reviewState({reviewStatus:'needs_source_check',ruleCheckedAt:now.toISOString()},now),'pending');
});
