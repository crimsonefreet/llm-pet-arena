'use client';

/**
 * 一次性 consent modal —— 用户第一次粘 JSON 时弹一次
 *
 * 设计意图：把"宠物进入公共池"的产品事实告诉用户，给他们选 in/out 的机会。
 * Accept → 写 localStorage.petarena.consent.v1 = '1'，后续 paste 自动上传无弹窗
 * Decline → 不上传，本地玩，仍可粘 JSON 看自己的宠物
 *
 * 视觉契约：复用 v-arcade 配色（gold/amber over velvet dark），不引入新色
 */

interface Props {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentModal({ open, onAccept, onDecline }: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{
        background: 'rgba(8, 4, 14, 0.78)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="relative w-full max-w-lg"
        style={{
          background: 'linear-gradient(135deg, #0d1b2a 0%, #100510 100%)',
          border: '1px solid rgba(212,175,55,0.4)',
          boxShadow: '0 30px 90px rgba(0,0,0,0.85), 0 0 60px rgba(212,175,55,0.18)',
          padding: '32px 36px',
        }}
      >
        {/* 4 corner brackets —— 复用 Arcade 装饰 */}
        <CornerBracket position="tl" />
        <CornerBracket position="tr" />
        <CornerBracket position="bl" />
        <CornerBracket position="br" />

        <p
          className="text-[10px] tracking-[0.4em] uppercase mb-3"
          style={{ color: 'rgba(212,175,55,0.6)' }}
        >
          // 0x0010 · public pool · consent
        </p>

        <h2
          id="consent-title"
          className="text-2xl mb-4"
          style={{
            color: '#ffd700',
            fontFamily: 'var(--font-cinzel), Cinzel, serif',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textShadow: '0 0 16px rgba(255,215,0,0.3)',
          }}
        >
          Your Pet Joins the Arena
        </h2>

        <div className="space-y-3 mb-7 text-[13px] leading-relaxed" style={{ color: '#f5e9c8' }}>
          <p>
            Once you generate a pet, its card (stats / skills / lore) is added to a{' '}
            <span style={{ color: '#ffd700' }}>public battle pool</span> so other players can
            challenge you randomly.
          </p>
          <p style={{ color: 'rgba(245,233,200,0.85)' }}>
            <span style={{ color: '#ffd700' }}>generation_evidence</span>（i.e. the chat snippets
            your LLM used）<span style={{ color: '#ffd700' }}>never leaves your browser</span>. Only
            the public pet card travels.
          </p>
          <p style={{ color: 'rgba(245,233,200,0.6)', fontSize: '11px', fontStyle: 'italic' }}>
            // 你生成的宠物会进入公共战斗池，evidence 字段（原始对话）始终留在本地不会上传。
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            onClick={onDecline}
            className="px-5 py-2 text-[11px] tracking-[0.25em] uppercase"
            style={{
              color: 'rgba(212,175,55,0.6)',
              border: '1px solid rgba(212,175,55,0.2)',
              background: 'transparent',
            }}
          >
            Keep Local Only
          </button>
          <button
            onClick={onAccept}
            className="px-5 py-2 text-[11px] tracking-[0.25em] uppercase"
            style={{
              color: '#0a0510',
              background: 'linear-gradient(135deg, #ffd700, #d4af37)',
              border: '1px solid #ffd700',
              fontWeight: 700,
              boxShadow: '0 0 18px rgba(212,175,55,0.4)',
            }}
          >
            ✦ Join the Arena
          </button>
        </div>
      </div>
    </div>
  );
}

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: '14px',
    height: '14px',
    border: '2px solid #ffd700',
  };
  const styles: Record<typeof position, React.CSSProperties> = {
    tl: { ...base, top: -1, left: -1, borderRight: 'none', borderBottom: 'none' },
    tr: { ...base, top: -1, right: -1, borderLeft: 'none', borderBottom: 'none' },
    bl: { ...base, bottom: -1, left: -1, borderRight: 'none', borderTop: 'none' },
    br: { ...base, bottom: -1, right: -1, borderLeft: 'none', borderTop: 'none' },
  };
  return <span aria-hidden style={styles[position]} />;
}
