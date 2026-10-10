# 网站打不开时怎么用

线上地址是 `https://er18-w.github.io/ai-free-opportunities/`。GitHub Pages 在部分网络环境下可能连接慢或打不开；这不等于仓库或页面已经被删除。

## 最稳妥的备用方式

1. 在 GitHub 仓库中下载根目录的 `standalone.html`。
2. 保存到电脑后双击打开。
3. 页面中的搜索、筛选、详情和官方链接均可使用；当前目录数据已经内嵌在文件中。

普通 `index.html` 会继续读取 `data/*.json`，直接双击时浏览器可能阻止本地读取，因此离线分享必须使用 `standalone.html`。

## 更新离线文件

在项目目录运行：

```text
npm run build
```

新的 `standalone.html` 会覆盖旧文件。把这一个文件发给朋友即可，不需要一起发送 `assets` 或 `data` 文件夹。

如果要长期面向中国大陆网络分享，可在后续把同一份 `dist/` 同步到国内静态托管。迁移前应先确定域名、托管账号和备案要求，网站代码无需重写。
