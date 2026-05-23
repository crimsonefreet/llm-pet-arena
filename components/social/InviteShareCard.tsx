'use client';

import { useState } from 'react';
import { copyToClipboard } from '@/lib/clipboard';

interface Props {
  open: boolean;
  myPetId: string;
  onClose: () => void;
}

/**
 * 邀请朋友 modal —— 生成 ?op=<myPetId> share URL，一键复制
 */
export function InviteShareCard({ open, myPetId, onClose }: Props) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');

  if (!open) return null;

  // build URL from current location—works for any deploy
  const base =
    typeof window !== 'undefined' ? `${window.location.origin}/v-arcade/battle` : '';
  const shareUrl = `${base}?op=${encodeURIComponent(myPetId)}`;

  const handleCopy = async () => {
    const ok = await copyToClipboard(shareUrl);
    setCopied(ok ? 'ok' : 'fail');
    setTimeout(() => setCopied('idle'), 2400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{
        background: 'rgba(8, 4, 14, 0.78)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="relative w-full max-w-xl"
        style={{
          background: 'linear-gradient(135deg, #0d1b2a 0%, #100510 100%)',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          boxShadow: '0 30px 90px rgba(0,0,0,0.85), 0 0 60px rgba(212,175,55,0.18)',
          padding: '32px 36px',
        }}
      >
        <p className="text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: 'rgba(212,175,55,0.6)' }}>
          // invite a friend · share challenge link
        </p>

        <h2
          id="invite-title"
          className="text-2xl mb-5"
          style={{
            color: '#ffd700',
            fontFamily: 'var(--font-cinzel), Cinzel, serif',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textShadow: '0 0 16px rgba(255,215,0,0.3)',
          }}
        >
          Send the Challenge
        </h2>

        <p className="text-[13px] leading-relaxed mb-5" style={{ color: '#f5e9c8' }}>
          Share this URL with a friend. They paste their own LLM-generated pet, and the arena pits
          your two creatures against each other.
        </p>

        <div
          className="flex items-center gap-2 mb-5 px-3 py-3 font-mono text-[11px]"
          style={{
            background: 'rgba(8, 4, 14, 0.7)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            color: '#ffe082',
            wordBreak: 'break-all',
            overflowWrap: 'anywhere',
          }}
        >
          {shareUrl}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-[11px] tracking-[0.25em] uppercase"
            style={{
              color: 'rgba(212,175,55,0.6)',
              border: '1px solid rgba(212,175,55,0.2)',
              background: 'transparent',
            }}
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="px-5 py-2 text-[11px] tracking-[0.25em] uppercase"
            style={{
              color: '#0a0510',
              background: 'linear-gradient(135deg, #ffd700, #d4af37)',
              border: '1px solid #ffd700',
              fontWeight: 700,
              boxShadow: '0 0 18px rgba(212,175,55,0.4)',
            }}
          >
            {copied === 'ok' ? '✓ Copied' : copied === 'fail' ? 'Failed' : '↳ Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
