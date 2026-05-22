-- LLM Pet Arena · D1 schema
-- 公共宠物池：用户生成后剥离 evidence 入库，供他人随机匹配对战

CREATE TABLE IF NOT EXISTS pets (
  pet_id      TEXT PRIMARY KEY,        -- pet.pet_id（去重锚点，INSERT OR REPLACE）
  name        TEXT NOT NULL,
  rarity      TEXT NOT NULL,           -- N / R / SR / SSR / UR
  source_llm  TEXT NOT NULL,           -- claude / chatgpt / gemini / deepseek
  data        TEXT NOT NULL,           -- 完整 pet JSON（evidence 已剥）
  created_at  INTEGER NOT NULL         -- unix ms
);

CREATE INDEX IF NOT EXISTS idx_pets_created ON pets(created_at);
CREATE INDEX IF NOT EXISTS idx_pets_rarity  ON pets(rarity);
