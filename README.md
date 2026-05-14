# Pet Arena

> 让你常用的 LLM 基于真实使用历史，生成一只独属于你的 AI 宠物。

See `Context.md` for product spec, `CLAUDE.md` for AI agent guidance.

## Tech Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Zod · Vitest + @testing-library/react · html2canvas

## Dev

```powershell
npm install
npm run dev      # http://localhost:3000
npm test         # vitest
npm run build    # production build
```

## 玩家路径

1. 进首页 → 看示例卡轮播（Tessera / Aether-7 / Vesper 自动切换）
2. 点 **Copy Prompt** 复制 Claude prompt 到剪贴板
3. 去 Claude 跑 prompt 拿到 JSON
4. 回站点粘贴（支持 ```` ```json ```` markdown fence、前后说明文字、字符串内含 `{` 等）
5. 看到自己的 Terminal 风卡片实时渲染
6. 点 **↓ EXPORT PNG** 导出 1080×1350 PNG 分享

## 隐私模型

- 所有 JSON 解析、卡片渲染、对战计算跑在浏览器，零后端
- `generation_evidence` 字段**绝不渲染**到卡片或 PNG（隐私红线）
- 卡片角标 `petarena.xyz`，不暴露 LLM 出处

## Sprint 1 范围

仅支持 Claude 派、单一 Terminal 卡片风格。字段编辑、对战、Gallery、多 LLM 派系见后续 Sprint。
