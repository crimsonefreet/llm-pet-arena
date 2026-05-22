# LLM Pet Arena

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

## Deploy

静态导出（`output: 'export'`）双部署，分别覆盖海外与国内：

| 平台 | URL | 适用 |
|---|---|---|
| Vercel | https://llm-pet-arena.vercel.app | 海外用户主线（GFW 内不可达） |
| Cloudflare Workers | https://llm-pet-arena.crimsonefr.workers.dev | 国内用户主线（anycast → HK/SG 边缘） |

### 首次部署

```powershell
# Vercel
npm i -g vercel
vercel login        # 邮箱 OAuth
vercel --prod       # 项目名填 llm-pet-arena

# Cloudflare Workers Static Assets
npx wrangler login  # 浏览器 OAuth
npm run deploy:cf
```

### 日常重部署

```powershell
npm run deploy:vercel
npm run deploy:cf
```

### GFW 注意

Vercel 在国内 DNS + SNI 双重封锁不可达。CF Workers `*.workers.dev` 子域经 anycast 路由到 HK/SG 边缘，国内多数网络可达，实测 LCP 3-5s（参考 [Parent MBTI 项目](https://pbti.crimsonefr.workers.dev)）。

自定义域 `petarena.xyz` 留 Sprint 2 处理（海外指 Vercel、国内 CNAME 指 workers.dev）。

## Sprint 1 范围

仅支持 Claude 派、单一 Terminal 卡片风格。字段编辑、对战、Gallery、多 LLM 派系见后续 Sprint。
