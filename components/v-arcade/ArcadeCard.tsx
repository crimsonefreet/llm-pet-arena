'use client';

import type { Pet, Rarity, Element } from '@/lib/pet/schema';
import { PetCreature } from './PetCreature';
import styles from './ArcadeCard.module.css';

// ── Helpers ────────────────────────────────────────────────────

const RARITY_STARS: Record<Rarity, string> = {
  N:   '★',
  R:   '★★',
  SR:  '★★★',
  SSR: '★★★★',
  UR:  '★★★★★',
};

const ELEMENT_GLYPH: Record<Element, string> = {
  '火': '火',
  '水': '水',
  '土': '土',
  '雷': '雷',
  '暗': '暗',
  '金': '金',
};

const ELEMENT_STYLE: Record<Element, string> = {
  '火': styles.elementFire,
  '水': styles.elementWater,
  '土': styles.elementEarth,
  '雷': styles.elementThunder,
  '暗': styles.elementDark,
  '金': styles.elementMetal,
};

const SKILL_ELEM_STYLE: Record<Element, string> = {
  '火': styles.skillElemFire,
  '水': styles.skillElemWater,
  '土': styles.skillElemEarth,
  '雷': styles.skillElemThunder,
  '暗': styles.skillElemDark,
  '金': styles.skillElemMetal,
};

/** 颜色最浓的主元素用于 art window 氛围光 */
const ELEMENT_GLOW: Record<Element, string> = {
  '火': '#ff6b35',
  '水': '#4fc3f7',
  '土': '#a1887f',
  '雷': '#fff176',
  '暗': '#b39ddb',
  '金': '#e0e0e0',
};

function dominantFaction(fa: Pet['faction_affinity']): 'chat' | 'cowork' | 'code' {
  const keys: ('chat' | 'cowork' | 'code')[] = ['chat', 'cowork', 'code'];
  return keys.reduce((a, b) => (fa[a] >= fa[b] ? a : b));
}

function rarityCardClass(r: Rarity): string {
  const map: Record<Rarity, string> = {
    N:   styles.rarityN,
    R:   styles.rarityR,
    SR:  styles.raritySR,
    SSR: styles.raritySSR,
    UR:  styles.rarityUR,
  };
  return map[r];
}

function rarityBandClass(r: Rarity): string {
  const map: Record<Rarity, string> = {
    N:   styles.rarityBandN,
    R:   styles.rarityBandR,
    SR:  styles.rarityBandSR,
    SSR: styles.rarityBandSSR,
    UR:  styles.rarityBandUR,
  };
  return map[r];
}

function rarityGemClass(r: Rarity): string {
  const map: Record<Rarity, string> = {
    N:   styles.rarityGemN,
    R:   styles.rarityGemR,
    SR:  styles.rarityGemSR,
    SSR: styles.rarityGemSSR,
    UR:  styles.rarityGemUR,
  };
  return map[r];
}

function llmBadgeClass(llm: Pet['source_llm']): string {
  const map: Record<Pet['source_llm'], string> = {
    claude:   styles.llmClaude,
    chatgpt:  styles.llmChatgpt,
    gemini:   styles.llmGemini,
    deepseek: styles.llmDeepseek,
  };
  return map[llm];
}

// CornerSVG — ornate TCG corner motif
function CornerSVG() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer L bracket */}
      <path d="M2 2 L18 2" stroke="#ffd700" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M2 2 L2 18" stroke="#ffd700" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Inner accent bracket */}
      <path d="M8 8 L16 8" stroke="#d4af37" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
      <path d="M8 8 L8 16" stroke="#d4af37" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
      {/* Diamond pip */}
      <rect x="3.5" y="20" width="5" height="5" transform="rotate(45 6 22.5)" fill="#d4af37" opacity="0.8"/>
      {/* Filigree lines */}
      <path d="M12 2 L12 6 M16 2 L16 4 M20 2 L20 3" stroke="#d4af37" strokeWidth="0.8" opacity="0.5"/>
      <path d="M2 12 L6 12 M2 16 L4 16 M2 20 L3 20" stroke="#d4af37" strokeWidth="0.8" opacity="0.5"/>
    </svg>
  );
}

// Stat row component
function StatRow({ label, value }: { label: string; value: number }) {
  const isHigh = value >= 85;
  return (
    <div className={styles.statRow}>
      <span className={styles.statKey}>{label}</span>
      <div className={styles.statBarTrack}>
        <div
          className={`${styles.statBarFill} ${isHigh ? styles.statBarFillHigh : ''}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={styles.statNum}>{value}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

interface Props {
  pet: Pet;
}

export function ArcadeCard({ pet }: Props) {
  const dom = dominantFaction(pet.faction_affinity);
  const primaryElement = pet.elements[0];
  const artGlowColor = ELEMENT_GLOW[primaryElement];

  const STAT_ORDER: (keyof Pet['stats'])[] = ['HP', 'ATK', 'DEF', 'SPD', 'INT', 'LUK'];

  // 按 type 排序：ult 优先
  const skillOrder = ['ult', 'main', 'std'] as const;
  const sortedSkills = [...pet.skills].sort(
    (a, b) => skillOrder.indexOf(a.type) - skillOrder.indexOf(b.type),
  );

  return (
    <div className={`${styles.card} ${rarityCardClass(pet.rarity)}`}>
      {/* ── Background layers ── */}
      <div className={`${styles.bgLayer} ${styles.bgGradient}`} />
      <div className={`${styles.bgLayer} ${styles.bgDots}`} />
      <div className={`${styles.bgLayer} ${styles.bgLines}`} />

      {/* ── Rarity accent band (top edge) ── */}
      <div className={`${styles.rarityBand} ${rarityBandClass(pet.rarity)}`} />

      {/* ── Outer golden frame ── */}
      <div className={styles.outerFrame} />
      <div className={styles.innerFrame} />

      {/* ── Corner ornaments ── */}
      <div className={styles.corners}>
        <div className={`${styles.corner} ${styles.cornerTL}`}><CornerSVG /></div>
        <div className={`${styles.corner} ${styles.cornerTR}`}><CornerSVG /></div>
        <div className={`${styles.corner} ${styles.cornerBL}`}><CornerSVG /></div>
        <div className={`${styles.corner} ${styles.cornerBR}`}><CornerSVG /></div>
      </div>

      {/* ── PACK OPENED badge ── */}
      <div className={styles.packBadge}>
        <div className={styles.packBadgeDot} />
        <span className={styles.packBadgeText}>Pack Opened</span>
      </div>

      {/* ── Rarity gem (top-right) ── */}
      <div className={`${styles.rarityGem} ${rarityGemClass(pet.rarity)}`}>
        <span className={styles.rarityStars}>{RARITY_STARS[pet.rarity]}</span>
        <span className={styles.rarityText}>{pet.rarity}</span>
      </div>

      {/* ── Header: name banner ── */}
      <div className={styles.headerZone}>
        <div className={styles.nameBannerWrap}>
          <div className={styles.nameBanner}>
            <span className={styles.petName}>{pet.name.toUpperCase()}</span>
            <span className={styles.petTitle}>{pet.title}</span>
          </div>
        </div>
      </div>

      {/* ── Class / Element strip ── */}
      <div className={styles.classStrip}>
        <span className={styles.classTag}>{pet.main_class}</span>
        {pet.sub_class && (
          <>
            <div className={styles.classDot} />
            <span className={styles.classTagSub}>{pet.sub_class}</span>
          </>
        )}
        <div className={styles.elementCrest}>
          {pet.elements.map((el) => (
            <div key={el} className={`${styles.elementBadge} ${ELEMENT_STYLE[el]}`}>
              {ELEMENT_GLYPH[el]}
            </div>
          ))}
        </div>
      </div>

      {/* ── Art window ── */}
      <div className={styles.artWindow}>
        {/* Dynamic ambient glow based on element */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${artGlowColor}22 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* 宠物形象 SVG — 独属于 pet_id 的造型 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 24px',
          }}
        >
          <PetCreature pet={pet} />
        </div>

        {/* Corner brackets */}
        <div className={`${styles.artCorner} ${styles.artCornerTL}`} />
        <div className={`${styles.artCorner} ${styles.artCornerTR}`} />
        <div className={`${styles.artCorner} ${styles.artCornerBL}`} />
        <div className={`${styles.artCorner} ${styles.artCornerBR}`} />

        {/* Pet ID watermark */}
        <div className={styles.artWatermark}>{pet.pet_id}</div>
      </div>

      {/* ── Stats zone ── */}
      <div className={styles.statsZone}>
        <div className={styles.sectionLabel}>Core Stats</div>
        {STAT_ORDER.map((k) => (
          <StatRow key={k} label={k} value={pet.stats[k]} />
        ))}
      </div>

      <div className={styles.midRule} />

      {/* ── Faction banners ── */}
      <div className={styles.factionZone}>
        {(['chat', 'cowork', 'code'] as const).map((faction) => {
          const val = pet.faction_affinity[faction];
          const isDom = faction === dom;
          return (
            <div
              key={faction}
              className={[
                styles.factionBanner,
                faction === 'chat'   ? styles.factionChat   : '',
                faction === 'cowork' ? styles.factionCowork : '',
                faction === 'code'   ? styles.factionCode   : '',
                isDom ? styles.factionDominant : '',
              ].join(' ')}
              style={{ ['--faction-fill' as string]: `${val}%` }}
            >
              <span className={styles.factionLabel}>{faction.toUpperCase()}</span>
              <div
                className={[
                  styles.factionGem,
                  faction === 'chat'   ? styles.factionChatGem   : '',
                  faction === 'cowork' ? styles.factionCoworkGem : '',
                  faction === 'code'   ? styles.factionCodeGem   : '',
                ].join(' ')}
              >
                {/* 数字直接钉死圆球 dead-center，不再有元素角标(◆/⬟/</>)，避免视觉双重叠加 */}
                <span className={styles.factionVal}>{val}</span>
              </div>
              <div className={styles.factionBar}>
                <div
                  className={[
                    styles.factionBarFill,
                    faction === 'chat'   ? styles.factionChatFill   : '',
                    faction === 'cowork' ? styles.factionCoworkFill : '',
                    faction === 'code'   ? styles.factionCodeFill   : '',
                  ].join(' ')}
                  style={{ width: `${val}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Skills divider ── */}
      <div className={styles.scrollDivider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerGlyph}>✦</span>
        <span className={styles.dividerLabel}>Skill Matrix</span>
        <span className={styles.dividerGlyph}>✦</span>
        <div className={styles.dividerLine} />
      </div>

      {/* ── Skill scrolls ── */}
      <div className={styles.skillsZone}>
        {sortedSkills.map((skill, idx) => {
          const typeStyle =
            skill.type === 'ult'  ? styles.skillUlt :
            skill.type === 'main' ? styles.skillMain :
            styles.skillStd;

          const badgeStyle =
            skill.type === 'ult'  ? styles.skillTypeBadgeUlt :
            skill.type === 'main' ? styles.skillTypeBadgeMain :
            styles.skillTypeBadgeStd;

          const typeGlyph =
            skill.type === 'ult'  ? '⚡' :
            skill.type === 'main' ? '◆' : '▸';

          return (
            <div key={idx} className={`${styles.skillScroll} ${typeStyle}`}>
              <div className={`${styles.skillTypeBadge} ${badgeStyle}`}>
                {typeGlyph}
              </div>
              <div className={styles.skillBody}>
                <div className={styles.skillHead}>
                  <span className={styles.skillName}>{skill.name}</span>
                  <div className={styles.skillMeta}>
                    <span className={styles.skillPower}>PWR {skill.power}</span>
                    <span className={`${styles.skillElement} ${SKILL_ELEM_STYLE[skill.element]}`}>
                      {skill.element}
                    </span>
                  </div>
                </div>
                <div className={styles.skillDesc}>{skill.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Lore / Flavor text ── */}
      {pet.lore && (
        <div className={styles.loreScroll}>
          <span className={styles.loreQuote}>"</span>
          <span className={styles.loreText}>{pet.lore}</span>
          <span className={styles.loreQuote}>"</span>
        </div>
      )}

      {/* ── Footer strip ── */}
      <div className={styles.footerStrip}>
        <div className={styles.footerLLM}>
          <span className={styles.llmLabel}>SOURCE</span>
          <span className={`${styles.llmBadge} ${llmBadgeClass(pet.source_llm)}`}>
            {pet.source_llm.toUpperCase()}
          </span>
        </div>
        <span className={styles.footerSite}>LLMPETARENA</span>
        <span className={styles.footerPetId}>{pet.pet_id}</span>
      </div>
    </div>
  );
}
