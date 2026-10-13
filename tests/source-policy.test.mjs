import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldInspectSource,resourceLinks} from '../scripts/source-policy.mjs';
import {mergeLedger} from '../scripts/campaign-core.mjs';
const now=new Date('2026-10-13T08:00:00Z');
const source={url:'https://docs.example.com/pricing',status:'active',cadenceDays:7};
const prior={lastAttemptAt:'2026-10-11T08:00:00Z'};
test('稳定官方源按周复核，新线索只加速对应来源',()=>{
  assert.equal(shouldInspectSource(source,prior,{now}),false);
  assert.equal(shouldInspectSource(source,prior,{now,candidates:[{sourceUrl:'https://example.com/promo',firstSeenAt:'2026-10-13T01:00:00Z'}]}),true);
  assert.equal(shouldInspectSource(source,prior,{now,candidates:[{sourceUrl:'https://other.com/promo',firstSeenAt:'2026-10-13T01:00:00Z'}]}),false);
});
test('重复旧线索不触发复核，首次建库仍查全量',()=>{
  assert.equal(shouldInspectSource(source,prior,{now,candidates:[{sourceUrl:'https://example.com/promo',firstSeenAt:'2026-10-01',lastSeenAt:'2026-10-13'}]}),false);
  assert.equal(shouldInspectSource(source,prior,{now,force:true}),true);
  assert.equal(shouldInspectSource({...source,status:'stopped'},prior,{now,force:true}),false);
});
test('失败尝试参与轮查间隔，新线索也不在一天内反复重试',()=>{
  assert.equal(shouldInspectSource(source,{lastAttemptAt:'2026-10-13T07:00:00Z'},{now,candidates:[{sourceUrl:'https://example.com/new',firstSeenAt:'2026-10-13T01:00:00Z'}]}),false);
});
test('资源目录只读取站内详情，去除脚本和重复链接',()=>{
  const html='<script><a href="/models/fake">免费假条目</a></script><a href="/models/real/">平台 <b>免费API</b></a><a href="https://evil.com/models/other">免费</a><a href="/models/real/">平台 免费API</a><a href="/deals/">活动导航</a>';
  assert.deepEqual(resourceLinks(html,'https://www.igetoken.com/models/'),[{url:'https://www.igetoken.com/models/real/',title:'平台 免费API',summary:'平台 免费API'}]);
});
test('旧活动额度变化触发复核，相同内容重复看到不触发',()=>{
  const old={clusterId:'one',title:'免费API',discoveryExcerpt:'100次/月',firstSeenAt:'2026-10-01T08:00:00Z',revisionChangedAt:'2026-10-01T08:00:00Z',sourceUrl:'https://example.com/promo',discoveryScore:50};
  const unchanged=mergeLedger([old],[old],now.toISOString());
  const changed=mergeLedger([old],[{...old,discoveryExcerpt:'1000次/月'}],now.toISOString());
  assert.equal(shouldInspectSource(source,prior,{now,candidates:unchanged}),false);
  assert.equal(shouldInspectSource(source,prior,{now,candidates:changed}),true);
});
