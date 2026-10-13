# 第一批模型能力排名 · 2026-10-13

本轮先建立编程能力榜。理由很简单：当前免费模型中，编程类最容易找到同一公开基准的可复核数字。通用、推理、图像和语音仍按展示顺序，不用不同测试硬凑名次。

## 排名口径

- 基准：SWE-bench Verified。
- 版本：完整500题。
- 指标：resolved百分比，越高越好。
- 数据：模型厂商官方报告，或厂商官方模型卡中的Hugging Face评测字段。
- 边界：不同厂商使用的Agent工具、推理预算和运行设置并不完全相同，因此只能作为公开报告的同类参考。页面不把它说成本站实测，也不把高算力多次采样分数与普通单次结果混写。

## 当前名次

| 名次 | 模型 | 分数 | 证据 |
| --- | --- | ---: | --- |
| 1 | MiMo V2.6 Flash | 66.2% | [小米MiMo官方发布](https://mimo.mi.com/docs/en-US/news/latest/v2-6) |
| 2 | GPT OSS 120B | 62.4% | [OpenAI模型卡](https://deploymentsafety.openai.com/gpt-oss) |
| 3 | GPT OSS 20B | 60.7% | [OpenAI模型卡](https://deploymentsafety.openai.com/gpt-oss) |

Kiro免费档只有所有模型共享的50 credits/月，无法证明能够稳定完成足量任务。2026-10-13按准入规则移除Kiro平台，并移除仅通过Kiro免费档进入公开榜单的MiniMax M2.5、GLM-5、Claude Sonnet 4.5和Qwen3 Coder Next。模型本身的能力不受这一决定影响；移除原因只是本站不接受额度过小的免费渠道。

Kimi K3、GLM-5.3等模型公开了DeepSWE、Terminal-Bench等成绩，但这些分数不能直接与本组SWE-bench Verified数值混排，因此本轮仍显示待比较。生图、语音生成、语音识别也不是同一种任务，后续必须分别建口径。

