import type { Pet } from '@/lib/pet/schema';
import { generateAsciiSprite } from '@/lib/pet/ascii-sprite';
import styles from './TerminalCard.module.css';

// 三 faction 平局时的兜底顺序：chat > cowork > code
export function dominantFaction(
  fa: Pet['faction_affinity'],
): keyof Pet['faction_affinity'] {
  const order: (keyof Pet['faction_affinity'])[] = ['chat', 'cowork', 'code'];
  let bestKey = order[0];
  let bestVal = -1;
  for (const k of order) {
    if (fa[k] > bestVal) {
      bestVal = fa[k];
      bestKey = k;
    }
  }
  return bestKey;
}

const STAT_ORDER: (keyof Pet['stats'])[] = ['HP', 'SPD', 'ATK', 'INT', 'DEF', 'LUK'];

interface Props {
  pet: Pet;
}

export function TerminalCard({ pet }: Props) {
  const ascii = generateAsciiSprite(pet.pet_id);
  const dom = dominantFaction(pet.faction_affinity);
  const statValues = STAT_ORDER.map((k) => pet.stats[k]);
  const avg = (statValues.reduce((a, b) => a + b, 0) / statValues.length).toFixed(1);

  const nameClass = pet.name.length > 10
    ? `${styles.petName} ${styles.longName} ${styles.glow}`
    : `${styles.petName} ${styles.glow}`;

  const factionKeys: (keyof Pet['faction_affinity'])[] = ['chat', 'cowork', 'code'];

  return (
    <div className={styles.crt}>
      <div className={styles.topbar}>
        <span>PET-ARENA :: v0.1.0-alpha</span>
        <span className={styles.blink}>PROFILE LOADED</span>
      </div>

      <div className={styles.titleBlock}>
        <div className={styles.label}>// DESIGNATION</div>
        <div className={nameClass}>{pet.name.toUpperCase()}</div>
        <div className={styles.petTitle}>{pet.title}</div>
      </div>

      <div className={styles.metaStrip}>
        <div className={styles.metaCell}>
          <div className={styles.metaK}>RARITY</div>
          <div className={styles.metaVRare}>★ {pet.rarity}</div>
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaK}>CLASS</div>
          <div className={styles.metaV}>{pet.main_class}</div>
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaK}>SUB-CLASS</div>
          <div className={styles.metaV}>{pet.sub_class ?? '—'}</div>
        </div>
        <div className={styles.metaCell}>
          <div className={styles.metaK}>ELEMENT</div>
          <div className={styles.metaV}>{pet.elements.join(' / ')}</div>
        </div>
      </div>

      <pre className={styles.asciiBlock}>{ascii}</pre>

      <div className={styles.sectionHeader}>
        <span>// CORE STATS</span>
        <span>AVG {avg}</span>
      </div>
      <div className={styles.statsGrid}>
        {STAT_ORDER.map((k) => (
          <div key={k} className={styles.stat}>
            <span className={styles.statName}>{k}</span>
            <div className={styles.statBar}>
              <div className={styles.statFill} style={{ width: `${pet.stats[k]}%` }} />
            </div>
            <span className={styles.statNum}>{pet.stats[k]}</span>
          </div>
        ))}
      </div>

      <div className={styles.sectionHeader}>
        <span>// FACTION AFFINITY</span>
        <span>DOMINANT: {dom.toUpperCase()}</span>
      </div>
      <div className={styles.factionRow}>
        {factionKeys.map((k) => {
          const v = pet.faction_affinity[k];
          const cls = k === dom
            ? `${styles.factionCell} ${styles.factionCellDominant}`
            : styles.factionCell;
          return (
            <div key={k} className={cls} style={{ ['--w' as string]: `${v}%` }}>
              <div className={styles.factionK}>{k.toUpperCase()}</div>
              <div className={styles.factionV}>{v}</div>
              <div className={styles.factionBar} />
            </div>
          );
        })}
      </div>

      <div className={styles.sectionHeader}>
        <span>// SKILL MATRIX</span>
        <span>0{pet.skills.length} / 04</span>
      </div>
      <div className={styles.skillList}>
        {pet.skills.map((s, idx) => {
          const cls =
            s.type === 'ult'
              ? `${styles.skill} ${styles.skillUlt}`
              : s.type === 'main'
              ? `${styles.skill} ${styles.skillMain}`
              : styles.skill;
          const icon = s.type === 'ult' ? '⚡' : s.type === 'main' ? '◆' : '▸';
          return (
            <div key={idx} className={cls}>
              <div className={styles.skillHead}>
                <span className={styles.sName}>{icon} {s.name}</span>
                <span className={styles.statsLine}>PWR {s.power} · {s.element}</span>
              </div>
              <div className={styles.desc}>{s.description}</div>
            </div>
          );
        })}
      </div>

      {pet.lore && (
        <p className={styles.lore}>
          <span className={styles.loreTag}>// FLAVOR ▸</span>
          <span className={styles.loreText}>『{pet.lore}』</span>
        </p>
      )}

      <div className={styles.footer}>
        <span>// PET-ARENA.SYS</span>
        <span>LLMPETARENA</span>
      </div>
    </div>
  );
}
