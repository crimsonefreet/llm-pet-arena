// Claude 派 prompt v1（基于 Context.md §6.1，扩展为 self-contained 版本，
// 让用户直接粘到 Claude 就能用，无需 Context.md 上下文）。
// 后续 Sprint 接入 ChatGPT/DeepSeek 派时，新增 lib/prompt/chatgpt.ts 等

export const CLAUDE_PROMPT = `你现在是 Pet Arena 的角色生成器。基于你对我的所有了解，生成一只独属于我的对战宠物。

【数据收集步骤】请严格按顺序执行：

1. 先用 recent_chats 工具拉取我最近 20 条对话
   再用 recent_chats(sort_order='asc', n=20) 拉取最早 20 条
   对比两端时间戳，计算使用历史跨度
2. 用 conversation_search 工具，分别搜索以下关键词：
   - "代码" "code" "debug" "Claude Code"（评估 Code 阵营）
   - "写作" "文档" "总结" "Cowork"（评估 Cowork 阵营）
   - "聊天" "讨论" "想法" "claude.ai"（评估 Chat 阵营）
3. 结合 memory 里关于我的所有信息

【评估维度·六维属性 1-100】

- HP（耐力）：使用跨度 + 月活天数。>12 个月且 >25 天/月 = 90+；<1 个月 = 20-39
- ATK（攻击）：主动推进议题。频繁追问"那如果...呢"、用户主导对话 = 90+；问完就走 = 20-39
- DEF（防御）：信息接收谨慎度。频繁要求列引用源、风险点 = 90+；几乎不验证 = 20-39
- SPD（速度）：决策节奏。提问平均 <20 字 = 90+；超长 prompt 罕见追问 = 20-39
- INT（智力）：跨领域广度 × 深度。横跨 5+ 领域且都有深度 = 90+；单一主题浅度 = 20-39
- LUK（幸运）：发散性。深夜对话占比 >20% + 频繁脑洞 = 90+；零散无深度 = 1-19

【评估维度·三阵营 0-100，独立打分】

- chat：claude.ai 网页/App 对话痕迹（基于产品名出现频率，不是任务类型！）
- cowork：Claude Cowork 桌面应用使用证据
- code：Claude Code CLI / API 编程使用证据

【评估维度·稀有度】

- UR：六维平均 ≥85 且 ≥3 维 ≥90
- SSR：六维平均 75-84 或某 1 维 ≥95
- SR：六维平均 60-74
- R：六维平均 40-59
- N：六维平均 <40

【评估维度·元素】

从五元素 + 特殊"金"中选 1-2 个：
- 火：激情/速度 · 水：变化/适应 · 土：稳重/防御 · 雷：突进/暴力 · 暗：深邃/混沌
- 金（特殊）：金融/财经/严谨场景才解锁

【评估维度·技能】

固定 4 个技能，威力分布严格：1×ult(power 90+) + 1×main(power 80-89) + 2×std(power 60-79)
技能名要呼应主要使用模式，描述 ≤ 80 字。

【输出格式】严格输出以下 JSON（不要加额外说明，不要 markdown 围栏，仅 JSON）：

{
  "pet_id": "{user_handle}_{flavor}_{3 位数字}",
  "name": "中英文混搭，1-15 字",
  "title": "1-15 字称号",
  "rarity": "N|R|SR|SSR|UR",
  "main_class": "主职业 2-6 字",
  "sub_class": "副职业 2-6 字（可选）",
  "elements": ["元素 1", "元素 2（可选）"],
  "faction_affinity": { "chat": 0-100, "cowork": 0-100, "code": 0-100 },
  "stats": { "HP": 1-100, "ATK": 1-100, "DEF": 1-100, "SPD": 1-100, "INT": 1-100, "LUK": 1-100 },
  "skills": [
    { "name": "技能名", "element": "元素", "power": 90-100, "type": "ult", "description": "≤80 字" },
    { "name": "技能名", "element": "元素", "power": 80-89, "type": "main", "description": "≤80 字" },
    { "name": "技能名", "element": "元素", "power": 60-79, "type": "std", "description": "≤80 字" },
    { "name": "技能名", "element": "元素", "power": 60-79, "type": "std", "description": "≤80 字" }
  ],
  "lore": "≤40 字人物志（可选）",
  "generation_evidence": ["3-5 条真实对话证据 / memory 引用，仅本地预览"],
  "source_llm": "claude",
  "generated_at": "ISO 8601 时间戳"
}

【自检步骤】交付前请核查：

1. 每个 stat 是否都有至少 2 条 evidence 支撑？
2. faction_affinity 是否基于产品名出现频率，而非任务类型？
3. 技能威力分布是否符合 1×ult + 1×main + 2×std？
4. 数值是否集中在 70-85？如果是，重新分配以拉开梯度。
5. 稀有度是否符合阈值定义？

请开始数据收集，并输出最终 JSON。`;
