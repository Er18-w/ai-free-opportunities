# 模型平台补查记录（2026-10-13）

本轮先按平台完整目录发现，再按逐型号免费规则筛选。新线索先入本地候选，再进入公开数据。保留现有切换页面与能力排名；新增条目没有可比评测时不填能力名次。

## 优先使用的来源

| 来源 | 覆盖与用途 | 本轮结论 |
| --- | --- | --- |
| [魔搭](https://www.modelscope.cn/posts/435591) | 国产文本、图像、视频；模型目录与API资格分开核验 | 登录每日200魔粒，绑定阿里云另加50；共享池，扣量各异。旧每天2000次口径不再使用 |
| [硅基流动](https://www.siliconflow.cn/pricing) | 多厂商文本、翻译、OCR、图像、音频、检索 | 按实时价格挑零价型号；不能把热门Qwen/DeepSeek/GLM或视频型号一概当免费 |
| [模力方舟](https://ai.gitee.com/serverless-api) | 多厂商国产模型、科研与多模态 | 保留已有核查；本轮静态页未读到完整型号，未新增型号、未刷新旧核实时间 |
| [NVIDIA](https://build.nvidia.com/models) | 多厂商强文本及多模态API | Free Endpoint才是云端免费入口；Downloadable仅表示可下载。给Nemotron 3 Ultra补上已核官方API通道 |
| [OpenRouter](https://openrouter.ai/api/v1/models) | 多厂商统一API、免费型号轮换 | 新增平台目录；给7个已有型号加备用渠道，不重复创建模型。免费档共享50次/日、20次/分钟，见[官方限额](https://openrouter.ai/docs/api_reference/limits) |
| [爱思](https://wiki.agnes-ai.com/en/docs/pricing) | 自家文本、图像、视频API | 新增国际站平台和3个模型；不是多厂商聚合站。中国站是否同权益待核实 |
| [商汤日日新](https://www.sensenova.cn/token-plan) | 自家办公Agent及图像模型 | 保留当前公测60,000积分/5小时池；不把积分直接当调用次数。U1 Fast详细型号与消耗未完成核实，先保留平台信息 |

补充来源沿用已在目录中的Groq、Cloudflare Workers AI、OpenCode。它们分别补充推理服务、共享日池、多模型Agent；不需要把每个小型中转站都列为主路径。聚合资讯与社区用于发现，价格和资格回官方确认。

## 爱思新增的三个型号

- Agnes 3.0 Flash：当前输入输出零价，可接编程Agent和工具；免费文本共用10次/分钟。旧20次/分钟已于9月23日下调。
- Agnes Image 2.5 Flash：当前1K至4K输出与参考图零价；免费有效限速分别为1K 10次、2K 5次、3K/4K 1次每分钟。
- Agnes Video 2.5 Flash：限时零价，720P，单条4–12秒；免费档1次/分钟，另有日时长限制但未公开数值。

依据：[免费档限速](https://wiki.agnes-ai.com/en/docs/tokenplan)、[申请及国际站入口](https://wiki.agnes-ai.com/en/docs/faqs)、[文本型号](https://wiki.agnes-ai.com/en/docs/agnes-30-flash)、[图像型号](https://wiki.agnes-ai.com/en/docs/agnes-image-25-flash)、[视频型号](https://wiki.agnes-ai.com/en/docs/agnes-video-25-flash)。本次均为公开官方规则核验，未注册账号、未调用生成接口。免费量恢复只确认分钟限速；其他周期不猜。

免费档的低频个人任务价值与实际排队速度分开记录，当前不承诺高频Agent、无限量或大陆直连。4,000图/日和500秒视频/日属于付费订阅，不写给免费用户。泛FAQ的永久免费说法与具体型号促销口径不一致时，采用逐型号最新价格规则，截止日写未公布。

## 本轮补入的已有模型通道

OpenRouter：Nemotron 3 Super、Nemotron 3 Ultra、Nemotron 3.5 Lightning、Nemotron 3 Nano Omni、Laguna S 2.1、Laguna XS 2.1、Gemma 4 26B A4B。逐项确认实时目录中的具体 `:free` ID和输入输出零价；共享50次/日不适合长链高频任务，只作备用。

NVIDIA：[Nemotron 3 Ultra](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b)官方页面同时给出Free Endpoint、模型ID和API示例。日总量、地区资格与速度仍待账户实测。

## 仍需补核的缺口

- 爱思国际站与中国站不能互相代用额度；免费视频每日总秒数、排队、任务成功率未核实。
- 模力方舟动态列表需浏览器逐页核查；不能把本轮静态读取为空解读为平台没有模型。
- [AMD与魔搭活动](https://www.modelscope.cn/posts/437059)有额外身份绑定条件；不把短期10次体验或未经核实的网关ID直接上榜。
- WorkBuddy HY3/HY4额外每日限免仍需活动原文或账号页面证据；不能用常规共享月积分替代用户指出的活动。

## 更新安排

每天执行一次现有工作流。新增爱思价格与限速、OpenRouter模型目录；稳定规则按周轮查，聚合线索触发提前复核。新增监控只产候选，不直接改公开免费量或能力名次。价格改收费、额度下调和失效是优先处理事项；抓取失败保留上次记录并标记待人工处理。
