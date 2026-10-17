const providerKeys = new Map([
  ['OpenRouter', 'openrouter'],
  ['Groq', 'groq'],
  ['商汤日日新', 'sensenova'],
  ['NVIDIA NIM', 'nvidia-nim'],
  ['Cloudflare', 'cloudflare'],
  ['Cloudflare Workers AI', 'cloudflare'],
  ['硅基流动', 'siliconflow'],
  ['OpenCode Zen', 'opencode'],
  ['Agnes AI 爱思（国际站）', 'agnes'],
  ['模力方舟 Gitee AI', 'gitee-ai'],
  ['Cohere', 'cohere'],
  ['蚂蚁百灵', 'ant-ling'],
  ['阶跃星辰', 'stepfun']
]);

export function buildGatewayFeed(catalog) {
  const routes = [];

  for (const item of catalog.items ?? []) {
    if (item.status !== 'active') continue;
    const categories = mapCategories(item.categories ?? []);
    if (!categories.length) continue;

    for (const channel of item.freeChannels ?? []) {
      if (!channel.access?.includes('api')) continue;
      const providerKey = providerKeys.get(channel.provider) || slug(channel.provider);
      const upstreamModel = channel.modelId || reusablePrimaryModelId(item.modelId, providerKey);
      if (!upstreamModel) continue;

      routes.push({
        id: `${item.id}--${providerKey}`,
        catalogId: item.id,
        title: item.title,
        providerKey,
        providerName: channel.provider,
        upstreamModel,
        categories,
        capabilities: mapCapabilities(item.categories ?? []),
        activationStatus: item.experienceStatus === 'tested' ? 'verified' : 'candidate',
        allowance: channel.allowance || item.allowance || '待核实',
        regionStatus: channel.regionStatus || item.regionStatus || 'unknown',
        validUntil: channel.validUntil ?? null,
        sourceUrl: channel.sourceUrl || item.officialUrl,
        entryUrl: channel.entryUrl || item.entryUrl,
        lastVerifiedAt: channel.lastVerifiedAt || item.ruleCheckedAt,
        note: item.experienceStatus === 'tested'
          ? '网站已记录真实任务测试；本地账号仍需单独验证。'
          : '官方规则已收录，但尚未通过本站账号完成真实任务测试。'
      });
    }
  }

  routes.sort((a, b) => a.providerKey.localeCompare(b.providerKey) || a.title.localeCompare(b.title, 'zh-CN'));
  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    catalogUpdatedAt: catalog.updatedAt,
    policy: {
      purpose: '供个人免费模型网关发现候选，不包含凭据，也不授权自动启用。',
      activationRule: 'candidate 只进入待测试；verified 仍需本地账号首次实测。',
      paidFallback: false
    },
    routeCount: routes.length,
    routes
  };
}

function mapCategories(categories) {
  const mapped = new Set();
  if (categories.includes('coding')) mapped.add('coding');
  if (categories.some(value => ['text', 'general', 'reasoning', 'vision'].includes(value))) mapped.add('chat');
  if (categories.some(value => ['image', 'video'].includes(value))) mapped.add('media');
  return [...mapped];
}

function mapCapabilities(categories) {
  const mapped = new Set();
  for (const category of categories) {
    if (['coding', 'text', 'general', 'reasoning'].includes(category)) mapped.add('text');
    if (category === 'vision') mapped.add('vision');
    if (category === 'image') mapped.add('image-generation');
    if (category === 'video') mapped.add('video-generation');
  }
  return [...mapped];
}

function slug(value = '') {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'unknown-provider';
}

function reusablePrimaryModelId(modelId, providerKey) {
  if (!modelId) return null;
  if (modelId.startsWith('@cf/')) return providerKey === 'cloudflare' ? modelId : null;
  return modelId;
}

