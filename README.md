# AI 免费机会情报站

面向个人和小范围分享的静态网站，只收录足以完成实际任务的免费 AI 机会。普通小额、领取繁琐或明显低效的积分不进入榜单。

## 打开网站

- 在线版：<https://er18-w.github.io/ai-free-opportunities/>
- 在线地址访问不稳定时：下载仓库根目录的 `standalone.html`，双击即可使用。它内嵌样式、脚本和当前数据，不需要 Node.js，也不依赖本地服务器。

## 本地运行与验证

需要 Node.js 22 或更高版本。

```text
npm test
npm run validate
npm run build
npm run preview
```

然后打开 `http://127.0.0.1:8080`。构建会同时生成 `dist/` 网站和根目录 `standalone.html`。

## 数据与自动更新

- `data/catalog.json`：已通过严格准入、适合优先尝试的推荐机会。
- `data/radar.json`：46 条完整雷达库存，包括官方已列出的模型渠道、容量待测权益、低额参考和已有会员权益；它们不会冒充推荐榜。
- `data/sources.json`：原交接表中的 31 条搜索、核查、发现和协议路径。它们不是 31 个可直接入榜的平台。
- `data/changes.json`：公开机会的实质变化。
- `.runtime/candidates/`：自动发现但尚未通过准入的临时候选，被 Git 忽略，不进入网站。
- `docs/DAILY_UPDATE.md`：未来维护 Agent 的独立工作流。
- `docs/ACCESS.md`：在线地址打不开时的处理方法。

`npm run daily` 按每日、每周、每月频率核查来源。OpenRouter、OpenCode Zen 的免费型号和 AIHOT 发现的近期免费线索会进入私有候选区；AIHOT 内容不公开镜像，每条线索都要回到厂商官方来源核实。候选补齐免费条件、任务容量、地区和效率证据后，才能进入雷达或推荐榜。

GitHub Actions 每天北京时间 08:37 执行。候选和报告作为 14 天的私有工作流构件保存；公开仓库只提交来源健康状态。手动运行工作流并选择 `full_scan` 可以强制核查全部非停止来源。

## 部署

`.github/workflows/pages.yml` 将 `dist/` 发布到 GitHub Pages。推送到 `main` 后会自动测试、构建和部署。

当前公开条目采用“少而有用”的标准。数量增加来自补齐可完成任务的机会，不会把即梦普通领积分、TRAE 每日 100 积分、每月极小额度或 BYOK 工具拿来凑数。
