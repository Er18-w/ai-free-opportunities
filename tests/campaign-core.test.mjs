import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canonicalUrl,discoveryScore,matchesBenefit,likelySameCampaign,clusterCandidates,mergeLedger} from '../scripts/campaign-core.mjs';
const keywords=JSON.parse(fs.readFileSync(new URL('../data/campaign-keywords.json',import.meta.url),'utf8'));
test('规范化链接移除常见跟踪参数',()=>{assert.equal(canonicalUrl('https://example.com/deal/?utm_source=x&ref=abc&id=2'),'https://example.com/deal?id=2');});
test('高价值权益高于签到积分和拉人活动',()=>{const source={tier:'aggregator'};const valuable=discoveryScore({text:'新用户赠送 1000 万 token 公测免费',source,hasDate:true,hasOfficial:true,keywords});const weak=discoveryScore({text:'每日签到邀请好友得少量积分 拉人头',source,keywords});assert.ok(valuable>=70);assert.equal(weak,0);});
test('同产品同截止日的改写标题可以归成一个活动',()=>{const a={title:'WorkBuddy Hy3 模型限时免费到 10 月 31 日',targetProduct:'WorkBuddy',validUntil:'2026-10-31',sourceUrl:'https://a.example/1',sourceTier:'community',discoveryScore:50};const b={title:'WorkBuddy Hy3 限时免费 延长至 10 月 31 日',targetProduct:'WorkBuddy',validUntil:'2026-10-31',sourceUrl:'https://b.example/2',sourceTier:'aggregator',discoveryScore:60};assert.equal(likelySameCampaign(a,b),true);assert.equal(clusterCandidates([a,b]).length,1);});
test('候选账本保留首次发现时间并标记本轮未见',()=>{const old=[{clusterId:'old',title:'旧候选',discoveryScore:20,firstSeenAt:'2026-10-01T00:00:00.000Z',lastSeenAt:'2026-10-01T00:00:00.000Z'}];const merged=mergeLedger(old,[],'2026-10-10T00:00:00.000Z');assert.equal(merged[0].firstSeenAt,'2026-10-01T00:00:00.000Z');assert.equal(merged[0].status,'not_seen_this_run');});
test('普通软件 beta 不被误判成免费福利',()=>{assert.equal(matchesBenefit('Apple releases visionOS beta 3',keywords.benefits),false);assert.equal(matchesBenefit('Public beta is free for all users',keywords.benefits),true);});

