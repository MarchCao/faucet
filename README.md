# HAICE Apparel — B2B Website

中国服装 OEM / ODM B2B 网站 · 4 语言（中文 / 日本語 / English / 한국어）

- 正式域名：https://apparel.haice.top
- 联系邮箱：sales@haice.top

## 结构

- `src/templates/` — HTML 模板（base + 各页面）
- `src/i18n/{zh,ja,en,ko}.json` — 四语言文案
- `src/assets/` — CSS / JS / favicon
- `src/build.js` — 构建脚本
- `dist/` — 构建产物（发布到 `gh-pages` 分支）

## 构建

```bash
cd src && node build.js
```

## 发布

- `main` 分支：源码
- `gh-pages` 分支：`dist/` 内容 + CNAME（`apparel.haice.top`）
- GitHub Pages → Custom domain: `apparel.haice.top`（需在 DNS 服务商添加 CNAME 记录：`apparel` → `marchcao.github.io`）

## 说明

- 纯静态站，无后端。询盘表单通过 `mailto:` 在用户邮件客户端生成邮件（第一阶段方案，附件请直接发邮件）。
- 无虚构公司资质、工厂数据、客户案例与产能数字；产品信息待补充。
- 未使用 AI 生成图片冒充真实工厂/产品。
