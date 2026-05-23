# LLM Pet Arena

> 让你常用的 LLM 基于真实使用历史，生成一只独属于你的 AI 宠物——然后丢进竞技场和别人对打。

See `Context.md` for product spec, `CLAUDE.md` for AI agent guidance.

## Tech Stack

- **Frontend**: Next.js 14 (App Router, static export) · TypeScript · Tailwind · Zod
- **Backend**: Cloudflare Workers Static Assets + 单脚本 `/api/*` API
- **Database**: Cloudflare D1 (SQLite)
- **Test**: Vitest + @testing-library/react
- **Export**: Canvas 2D（产品级 PNG）

## Dev

```powershell
npm install
npm run dev          # http://localhost:3000  (Next.js)
npm run dev:worker   # http://localhost:8787  (CF Worker + D1 local)
npm test             # vitest (128+ tests)
npm run build        # production build
```

需要后端的功能（public pool / battle 随机匹配 / invite）只有同时跑 `dev` + `dev:worker` 才完整。

## 玩家路径

### 单人路径（Sprint 1 留存）

1. 进首页 → 看示例卡轮播（Tessera / Aether-7 / Vesper 自动切换）
2. 点 **Copy Prompt** 复制 Claude prompt 到剪贴板
3. 去 Claude 跑 prompt 拿到 JSON
4. 回站点粘贴（支持 ```` ```json ```` markdown fence、前后说明文字、字符串内含 `{` 等）
5. 看到自己的 v-arcade 风卡片实时渲染
6. 点 **↓ EXPORT PNG** 导出 1080×1350 PNG 分享

### 社交路径（Phase 1 + 2 新增）

1. 首次粘 JSON 时弹一次 **Consent Modal**——同意后 pet 入公共池（evidence 字段已剥离）
2. 完成后跳 `/v-arcade/battle`，两种入口：
   - 🎲 **Random** — 从公共池随机抽对手开打
   - 🔗 **Invite a Friend** — 复制 `?op=<myPetId>` URL 发给朋友
3. AI vs AI 自动演结，胜了 streak +1 进入下一场，败了 GameOverOverlay 显示总连胜
4. 朋友打开 invite URL → 看到挑战者卡片 → 跳主页 → 粘自己 JSON → 自动跳回 battle 应战

## 隐私模型

**本地优先 + consent gate + evidence 双重剥离**：

| 字段 | 在客户端 | 在公共池 (D1) | 在分享卡片 |
|---|---|---|---|
| 基本信息（name/stats/skills/elements/...） | ✓ | ✓（首次 consent 后） | ✓ |
| `generation_evidence`（真实聊天记录） | ✓（仅本地预览） | **✗ 已剥离** | **✗ 永不渲染** |

剥离链：JsonPaster `stripEvidence()` → Worker `worker/lib/strip-evidence.ts` → 入库（双保险）。

`consent.v1` 标记写在 `localStorage`；取消即可阻断后续上传。卡片角标固定 `petarena.xyz`，不暴露 LLM 出处。

## Deploy

静态导出（`output: 'export'`）双部署，分别覆盖海外与国内：

| 平台 | URL | 适用 |
|---|---|---|
| Vercel | https://llm-pet-arena.vercel.app | 海外用户主线（GFW 内不可达） |
| Cloudflare Workers | https://llm-pet-arena.crimsonefr.workers.dev | 国内用户主线 + API 全平台共享 |

### D1 数据库初始化（首次部署必跑）

```powershell
npx wrangler d1 create petarena
# 复制 database_id 到 wrangler.toml 的 [[d1_databases]] 节
npm run db:migrate:remote  # remote: 应用 worker/schema.sql 到生产 D1
npm run db:migrate:local   # local:  dev 用本地 D1
```

`npm run deploy:cf` 内部已经包含 `--remote` migration，日常部署不用单跑。

### 环境变量

```
# .env.local（dev）
NEXT_PUBLIC_API_BASE=http://localhost:8787

# Vercel（prod）
NEXT_PUBLIC_API_BASE=https://llm-pet-arena.crimsonefr.workers.dev
```

Vercel 端是纯静态资源，所有 `/api/*` 请求跨域打到 workers.dev。CORS 白名单见 `worker/lib/cors.ts`。

### 首次部署

```powershell
# Vercel
npm i -g vercel
vercel login        # 邮箱 OAuth
vercel --prod       # 项目名填 llm-pet-arena

# Cloudflare Workers + D1
npx wrangler login
npm run db:migrate:remote
npm run deploy:cf
```

### 日常重部署

```powershell
npm run deploy:vercel
npm run deploy:cf      # 自动 migrate + deploy
```

### GFW 注意

Vercel 在国内 DNS + SNI 双重封锁不可达。CF Workers `*.workers.dev` 子域经 anycast 路由到 HK/SG 边缘，国内多数网络可达，实测 LCP 3-5s（参考 [Parent MBTI 项目](https://pbti.crimsonefr.workers.dev)）。

自定义域 `petarena.xyz` 留 Sprint 2 处理（海外指 Vercel、国内 CNAME 指 workers.dev）。

## Sprint 范围

- **Sprint 1（已完成）**：单人路径——Claude 派、单一 v-arcade 卡片风格、Canvas 2D PNG 导出
- **Phase 1（已完成）**：Public pool 薄切片——D1 / Worker / Consent gate
- **Phase 2（已完成）**：Battle MVP + streak——AI vs AI 引擎 / Random 匹配 / Invite share URL / GameOver overlay
- **Phase 3（进行中）**：防滥用（rate limit）+ 视觉精修 + 文档
- **后续**：字段编辑、Gallery、多 LLM 派系（ChatGPT/Gemini/DeepSeek）、Leaderboard
