import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGatewayFeed} from '../scripts/gateway-feed.mjs';

test('网关清单只包含启用中的 API 通道', () => {
  const feed=buildGatewayFeed({
    updatedAt:'2026-10-17T00:00:00Z',
    items:[
      {id:'api',title:'API模型',modelId:'model-a',status:'active',categories:['coding','general'],experienceStatus:'not_tested',freeChannels:[{provider:'Groq',access:['api'],sourceUrl:'https://example.com'}]},
      {id:'web',title:'网页模型',modelId:'model-b',status:'active',categories:['general'],freeChannels:[{provider:'某平台',access:['web']}]},
      {id:'off',title:'下线模型',modelId:'model-c',status:'inactive',categories:['coding'],freeChannels:[{provider:'Groq',access:['api']}]}
    ]
  });
  assert.equal(feed.routeCount,1);
  assert.equal(feed.routes[0].providerKey,'groq');
  assert.deepEqual(feed.routes[0].categories,['coding','chat']);
  assert.equal(feed.routes[0].activationStatus,'candidate');
});

test('图片和视频统一进入媒体分类，但保留能力区别', () => {
  const feed=buildGatewayFeed({items:[
    {id:'image',title:'图片',modelId:'img',status:'active',categories:['image'],experienceStatus:'tested',freeChannels:[{provider:'Cloudflare Workers AI',access:['api']}]},
    {id:'video',title:'视频',modelId:'vid',status:'active',categories:['video'],freeChannels:[{provider:'Agnes AI 爱思（国际站）',access:['api']}]}
  ]});
  assert.deepEqual(feed.routes.map(item=>item.categories),[['media'],['media']]);
  assert.ok(feed.routes.some(item=>item.capabilities.includes('image-generation')));
  assert.ok(feed.routes.some(item=>item.capabilities.includes('video-generation')));
});

test('平台专属模型ID不会错误复用到没有专属ID的备用平台', () => {
  const feed=buildGatewayFeed({items:[{
    id:'cf-model',title:'Cloudflare模型',provider:'Cloudflare Workers AI',modelId:'@cf/example/model',status:'active',categories:['general'],freeChannels:[
      {provider:'Cloudflare Workers AI',access:['api']},
      {provider:'Groq',access:['api']},
      {provider:'OpenRouter',modelId:'example/model:free',access:['api']}
    ]
  }]});
  assert.deepEqual(feed.routes.map(item=>item.providerKey),['cloudflare','openrouter']);
  assert.ok(!feed.routes.some(item=>item.upstreamModel==='@cf/example/model'&&item.providerKey!=='cloudflare'));
});

