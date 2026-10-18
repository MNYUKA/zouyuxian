# 🍮 Yuka 的点心房

Yuka 的个人网站：Astro 静态生成 + Notion 写作发布 + GitHub Actions 自动构建部署 + GitHub Pages 免费托管。

## 日常使用

日常写作、发布都在 Notion 里完成，不需要碰这里的代码。详见《日常 Notion 写作手册》。

## 本地开发（给 Roman 用的备忘）

```bash
pnpm install
pnpm dev        # 本地预览 http://localhost:4321/zouyuxian/
pnpm sync       # 从 Notion 同步内容（需要 NOTION_TOKEN 等环境变量）
pnpm build      # 构建
```

## 目录说明

- `src/pages/` 页面
- `src/layouts/`、`src/components/` 布局与组件
- `src/styles/global.css` 设计系统（颜色/字体/排版/深色模式）
- `src/content-gen/` **机器管理目录**：Notion 同步脚本生成的内容，不要手工改
- `public/notion-img/` 同步脚本下载的 Notion 图片，不要手工改
- `scripts/sync-notion.mjs` Notion 同步脚本
- `.github/workflows/deploy.yml` 自动同步→构建→部署
