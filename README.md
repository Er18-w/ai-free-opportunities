# AI 免费机会排行榜

面向个人和小范围分享的免费 AI 排行榜。总榜按免费稳定性排序，也可以查看文本、编程、Agent、图像、视频和语音等类型榜。普通小额、领取繁琐或明显低效的积分不进入榜单。

## 打开网站

- 在线版：<https://er18-w.github.io/ai-free-opportunities/>
- 在线地址访问不稳定时：下载仓库根目录的 `standalone.html`，双击即可使用。它内嵌样式、脚本和当前数据，不需要 Node.js，也不依赖本地服务器。

## 本地运行与验证

需要 Node.js 22 或更高版本。

```text
npm test
npm run validate
npm run build
npm run campaign:bootstrap
npm run campaigns
npm run sources:bootstrap
npm run sources:plan
npm run preview
```

然后打开 `http://127.0.0.1:8080`。构建会同时生成 `dist/` 网站和根目录 `standalone.html`。

## 数据与自动更新

- `data/catalog.json`：持续免费层、免费试用和新人权益等正式上榜记录。
- `data/campaigns.json`：官方依据已核、达到任务容量门槛的活动记录；构建后与目录合并进入同一个排行榜，并显示限时标签。
- `data/campaign-sources.json`：聚合站、社区、官方验真页和人工巡检路径的活动情报源表。
- `data/source-map.json` 与 `data/sources.json`：前台合并为一个来源网络，包含重点厂商、产品、发现渠道和核查路径；进入网络不表示已经上榜。
- `data/radar.json`：46 条完整雷达库存，包括官方已列出的模型渠道、容量待测权益、低额参考和已有会员权益；它们不会冒充推荐榜。
- `data/changes.json`：公开机会的实质变化。
- `.runtime/candidates/`：自动发现但尚未通过准入的临时候选，被 Git 忽略，不进入网站。
- `docs/DAILY_UPDATE.md`：未来维护 Agent 的独立工作流。
- `docs/AIHOT_SEARCH_ADAPTATION.md`：AIHOT 搜索机制审查，以及本站的轻量改造方案。
- `docs/SOURCE_EXPANSION.md`：首次建库、每日轮换、查询词与维护 Agent 的来源拓宽说明。
- `docs/ACCESS.md`：在线地址打不开时的处理方法。

`npm run daily` 核查长期免费模型来源。首次建库用 `npm run sources:bootstrap` 生成“近 30 天广搜 + 第 31～90 天定向补漏”计划，再用 `npm run campaign:bootstrap` 汇总机器可读历史候选；之后每天运行 `sources:plan` 和 `campaigns`。AI 优惠聚合器、iGetoken、AIHOT、搜索结果和社区只负责生成私有候选；每条线索都要回到厂商官方来源核实。通过审核后，持续免费层、新人额度和限时权益进入同一排行榜，按 A 持续免费、B 条件免费、C 限时权益排序。

GitHub Actions 每天北京时间 09:17 执行一次。A 级重点对象每日检查，B/C 级轮换覆盖，长期来源仍按每日、每周、每月频率判断。候选和报告作为 14 天的私有工作流构件保存；公开仓库只提交来源健康状态。手动运行工作流并选择 `full_scan` 会重新生成完整查询计划并检查全部重点对象。

## 部署

`.github/workflows/pages.yml` 将 `dist/` 发布到 GitHub Pages。推送到 `main` 后会自动测试、构建和部署。

当前公开条目采用“少而有用”的标准。数量增加来自补齐可完成任务的机会，不会把即梦普通领积分、TRAE 每日 100 积分、每月极小额度或 BYOK 工具拿来凑数。
