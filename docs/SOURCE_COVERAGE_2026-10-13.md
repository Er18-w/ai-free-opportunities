# 首次补漏核查记录

日期：2026-10-13。当前57个模型、27个平台。数量不代表搜索完成；本表区分当前核验和仍需补证。免费规则核验不等于完整任务、网络与资格实测。

## 本轮收录

| 来源 | 处理与限制 | 官方依据 |
|---|---|---|
| 硅基流动 | 免费翻译、OCR、生图、转写、重排；BGE-M3合并已有模型第二渠道。Qwen3-ASR当前收费，排除旧免费摘要 | [实时价格](https://www.siliconflow.cn/pricing)、[实名与限速](https://docs.siliconflow.cn/docs/userguide/faqs/rate-limit-and-upgradation) |
| 模力方舟 | Atria、Intern-S2、文本与图文知识库接口；官方目录免费标签已核，固定日量待核 | [目录](https://ai.gitee.com/serverless-api?model=F5-TTS)、[调用说明](https://ai.gitee.com/docs/products/apis) |
| Cohere | A+、Reasoning；评估Key共用1000次/月，Chat20次/分钟 | [限额](https://docs.cohere.com/v2/docs/rate-limits)、[A+](https://docs.cohere.com/v2/docs/command-a-plus) |
| 百灵 | 新人20元券、每月1日10元券；只增加较省额度的Flash，不凭小券堆旗舰型号 | [新规则](https://developer.ant-ling.com/zh-CN/docs/getting-started/changelog/billing-upgrade/)、[迁移](https://developer.ant-ling.com/zh-CN/docs/models/deprecation/) |
| NVIDIA | Nano Omni免费开发端点；视频理解不等于生视频 | [端点](https://build.nvidia.com/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning) |
| 万擎 | Air V1零价；其他型号可能后付费，旧Pro2000万赠送包已失效 | [定价](https://streamlake.com/document/WANQING/mdsorb4ejjptsmfyrn)、[问题说明](https://www.streamlake.com/document/USER-GUIDELINE/mm5z8f6cbpi65nupx7h) |
| MoMA | 新认证2500万Token，先收平台；适用型号与期限看领取页，不当作300个免费模型 | [中国移动公告](https://www1.10086.cn/aboutus/news/groupnews/index_detail_55572.html) |
| 超算互联网 | 核心节点体验1000万Token；具体型号、资格和期限看领取页 | [官方](https://www.scnet.cn/help/docs/mainsite/activity/invite/quick-test/index.html) |
| Junie Lite | 常设免费Agent，当前Qwen3.6 27B；正常使用近乎不限量，仍有容量保护 | [官方](https://junie.jetbrains.com/docs/junie-lite.html) |
| Jules | 15任务/滚动24小时、3并发；免费套餐表为Gemini2.5 Pro | [额度](https://jules.google/docs/usage-limits/)、[步骤](https://jules.google/docs/) |
| Antigravity | 免费Agent周池，Gemini3.8 Flash与3.1 Pro；非免费裸API，非付费层5小时恢复 | [矩阵](https://antigravity.google/docs/models)、[套餐](https://antigravity.google/docs/plans) |

新条目不编造能力名次；未公布请求量的零价端点明确写待核，不能保证无限、速度、大陆直连或每个账户可用。

## 已查官方线索，仍不足以推荐或需要补证

| 来源 | 当前结果及下一步 |
|---|---|
| AMD Radeon Cloud | [官网](https://developer.amd.com.cn/radeon/tokenfactory)动态正文未读到，浏览器超时。核实型号、额度和延迟，不抄第三方2500万估算 |
| Atria直连 | [模型官方仓库](https://github.com/atria-asi/Atria-Dawn-Preview)成立；注册送1亿还缺官方额度证明。目前仅收模力方舟免费渠道 |
| Step Plan | [官网](https://platform.stepfun.com/step-plan)有“免费体验及购买名额调整通知”，正文未成功读到。不沿用第三方15+15天活动 |
| LongCat直连 | [当前2.5价格](https://longcat.chat/platform/docs/zh/pricing/longcat-2.5)收费；旧内测额度不能沿用。本站已有OpenCode免费渠道保留 |
| TokenRhythm | [官网](https://tokenrhythm.studio/)确认体验官额度，未确认当前注册68元；需具体活动规则 |
| TokenRouter | [实时目录](https://www.tokenrouter.com/models/)Nano Omni零价；旧GLM5.3-free线索不能沿用。账户门槛与额度未核，先使用NVIDIA渠道 |
| TokenHarbor | [FAQ](https://tokenharbor.ai/faq)为:free路由滚动7日价值额度、须数据使用同意；未公开具体价值。网页TH-Rudder活动不能当免费API |
| Mistral | [当前帮助](https://help.mistral.ai/en/articles/698531-why-am-i-hitting-api-rate-limits-and-how-do-i-increase-them)确认免费模式，额度在账户Limits；不抄每月10美元。[变更](https://docs.mistral.ai/resources/changelogs)确认Devstral2已收费 |
| Cerebras | [规则](https://inference-docs.cerebras.ai/support/rate-limits)为绑付款方式后一次5美元/30天，明确无持续免费层；不按历史日100万永久免费收录 |
| SambaNova | [控制台](https://cloud.sambanova.ai/)正文没有当前免费资格；第三方绑卡/免绑卡矛盾，待核 |
| InternLM直连 | [文档](https://internlm.intern-ai.org.cn/api/document)为空，不能照搬每月100万输入+300万输出 |
| Agnes | [入口](https://agnes.ai/)重定向新域名，免费额度正文未读到 |
| 天翼TokenHub | [官方教程](https://www.ctyun.cn/document/11057595/11091031)有指定新人2500万/2周，同时涉及需余额的云托管。先分清API试用与部署费用 |
| Cursor | [免费价格页](https://cursor.com/pricing)只写有限Agent请求，尚不能确认够干活 |
| Windsurf | [价格入口](https://windsurf.com/pricing)已重定向Devin，核对新产品规则，不沿用旧积分 |

## 已有来源与未完成部分

现有WorkBuddy、魔搭、Groq、OpenCode、Marvis、豆包、智谱、商汤、Kilo、Cline、Gemini CLI、Kiro、TRAE、Qoder、Cloudflare、DTMaaS继续保留。它们不因本轮补录自动变成账户任务已实测。

其他发现入口：百炼、火山、混元、千帆、星火、七牛、Moonshot、MiniMax、百川、Coze、OpenRouter、Gemini API、Copilot、Hugging Face、Together、Fireworks、Replicate、Replit、Leonardo、Runway、ElevenLabs、fal.ai、白山、360、PPIO、xAI、Dots、ZenMux。历史清单及第三方目录覆盖这些名称，本轮未逐个重新完成官方免费量核验，不得把有URL当已核实。小额、先充值或已到期线索不为增加数量发布。

## 首次与日常搜索

参考[AIHOT信源实现](https://github.com/KKKKhazix/AIHOT/blob/main/docs/sources.md)：目录/网页列表/RSS/社区线索分别处理，首次回灌与增量分开，失败不表示没有活动。本站保持每天一次。

首次查当前目录与价格，再沿公告回溯现有项目起点2026-06-01；通知较早但权益仍有效也要捕获。聚合站发现名称，官方定案。优先扫描完整套餐矩阵和目录，不只搜索已知模型名。

已配置42条官方监控路径。配置数不代表全部自动读取成功；manual_required必须由维护Agent补查，候选变动审核后才发布。
