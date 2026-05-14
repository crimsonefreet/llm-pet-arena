import { z } from 'zod';

// 元素：五元素 + 特殊金（Context.md §5.3）
export const ElementSchema = z.enum(['火', '水', '土', '雷', '暗', '金']);
export const RaritySchema = z.enum(['N', 'R', 'SR', 'SSR', 'UR']);

export const FactionAffinitySchema = z.object({
  chat: z.number().int().min(0).max(100),
  cowork: z.number().int().min(0).max(100),
  code: z.number().int().min(0).max(100),
});

export const StatsSchema = z.object({
  HP: z.number().int().min(1).max(100),
  ATK: z.number().int().min(1).max(100),
  DEF: z.number().int().min(1).max(100),
  SPD: z.number().int().min(1).max(100),
  INT: z.number().int().min(1).max(100),
  LUK: z.number().int().min(1).max(100),
});

export const SkillSchema = z.object({
  name: z.string().min(1).max(40),
  element: ElementSchema,
  power: z.number().int().min(1).max(100),
  type: z.enum(['ult', 'main', 'std']),
  description: z.string().max(80),
});

export const PetSchema = z.object({
  pet_id: z.string().min(1),
  name: z.string().min(1).max(20),
  title: z.string().max(20),
  rarity: RaritySchema,
  main_class: z.string().min(1),
  sub_class: z.string().optional(),
  elements: z.array(ElementSchema).min(1).max(2),
  faction_affinity: FactionAffinitySchema,
  stats: StatsSchema,
  skills: z.array(SkillSchema).length(4),
  lore: z.string().max(40).optional(),
  generation_evidence: z.array(z.string()).optional(),
  source_llm: z.enum(['claude', 'chatgpt', 'gemini', 'deepseek']),
  generated_at: z.string().datetime(),
});

export type Pet = z.infer<typeof PetSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Element = z.infer<typeof ElementSchema>;
export type Rarity = z.infer<typeof RaritySchema>;
