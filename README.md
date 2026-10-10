# AI 免费机会情报站

面向个人和小范围朋友分享的静态网站，只收录足以完成实际任务的免费 AI 机会。普通小额、领取繁琐或明显低效的领积分机会不会出现在网站中。

## 本地运行

需要 Node.js 22 或更高版本。

```text
npm test
npm run validate
npm run build
npm run preview
```

然后打开 `http://127.0.0.1:8080`。项目没有运行时依赖，访问者只加载静态 HTML、CSS、JavaScript 和 JSON。

## 数据与更新

- `data/catalog.json`：已通过准入、允许公开的机会。
- `data/sources.json`：已启用来源及健康状态。
- `data/changes.json`：公开机会的实质变化。
- `.runtime/candidates/`：自动发现但尚未通过准入的临时候选，被 Git 忽略，不会进入网站或公开仓库。
- `docs/DAILY_UPDATE.md`：维护 Agent 的完整工作流。

`npm run daily` 会核查 Groq 当前免费限额页面，并从 OpenRouter 公开模型目录发现零价候选。新候选只写入临时目录，不会自动公开。GitHub Actions 每天北京时间 08:37 执行；候选和运行报告保存为 14 天的工作流构件，公开仓库只提交来源健康状态。

## 部署

`.github/workflows/pages.yml` 将 `dist/` 发布到 GitHub Pages。首次使用需要在仓库 Settings → Pages 中将 Source 设为 GitHub Actions。仓库权限或 Pages 设置未完成时，代码仍可正常本地构建。

## 当前证据边界

首版只公开 Groq 免费计划中能够对应到当前官方免费限额表的两个模型。它们的规则已核，尚未使用用户账号做实际调用；页面会明确显示这个区别。原交接材料中的其他记录保留在项目交接文档之外，待逐项核验后再决定是否收录。
