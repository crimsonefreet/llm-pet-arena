'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { JsonPaster } from '@/components/JsonPaster';
import { ArcadeCard } from '@/components/v-arcade/ArcadeCard';
import { PromptBlock } from '@/components/PromptBlock';
import { ExportButton } from '@/components/ExportButton';
import { ArcadeHeader } from '@/components/v-arcade/ArcadeHeader';
import { ArcadeBackground } from '@/components/v-arcade/ArcadeBackground';
import { PetCardBack } from '@/components/v-arcade/PetCardBack';
import { ConsentModal } from '@/components/social/ConsentModal';
import { uploadPet } from '@/lib/api/endpoints';
import { hasConsent, grantConsent, setMyPetId, getMyPetId } from '@/lib/api/storage';
import type { Pet } from '@/lib/pet/schema';

// Arcade 视觉皮肤套到 / 主入口
// - layout 保留：12-col 网格 + 左 col-span-7 工作流 + 右 col-span-5 卡片舞台
// - 视觉换皮：phosphor 绿终端 → amber-on-velvet 金色 TCG
// - 缩放方案：container-query 100cqw / 1080px = unitless number, 让 transform scale 跟 col-span-5 宽度联动
// - 工作流子组件零文件改动：靠父级 inline 覆盖 --c-* CSS 变量
export default function Home() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [pendingUpload, setPendingUpload] = useState<Pet | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  // 已有宠物快捷入口：mount 时从 localStorage 读，paste 成功后同步刷新
  // —— 解决用户痛点："第二次访问主页找不到 ENTER ARENA 入口"
  const [savedPetId, setSavedPetId] = useState<string | null>(null);
  // 应战流程：朋友点了 ?op=<id> URL → 跳来主页 ?return=<encoded battle URL>
  // 主页生成 pet + upload 完成后自动跳回挑战页
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // SSR-safe：mount 后从 localStorage 读 myPetId + 从 URL 取 return 参数
  useEffect(() => {
    setSavedPetId(getMyPetId());
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('return');
      if (p) setReturnTo(p);
    }
  }, []);

  // 静默上传 + 写 myPetId（已有 consent 的情况）
  // 上传成功 / 失败都不阻塞 UI；若 returnTo 存在则跳转回挑战页
  const doUpload = useCallback(
    async (p: Pet) => {
      setMyPetId(p.pet_id);
      setSavedPetId(p.pet_id); // 同步刷新 UI，让 Welcome back 横条立即显示
      try {
        await uploadPet(p);
      } catch {
        // 上传失败仍跳转（本地有 pet，battle 页可能 fetchPet 失败 fallback）
      }
      // 应战流程：upload 完跳回挑战 URL
      if (returnTo && typeof window !== 'undefined') {
        window.location.href = returnTo;
      }
    },
    [returnTo]
  );

  // JsonPaster parse 成功后的 hook：第一次出 consent modal，后续静默
  const handleUploadable = useCallback(
    (p: Pet) => {
      if (hasConsent()) {
        doUpload(p);
      } else {
        setPendingUpload(p);
        setShowConsent(true);
      }
    },
    [doUpload]
  );

  const onConsentAccept = useCallback(() => {
    grantConsent();
    if (pendingUpload) doUpload(pendingUpload);
    setShowConsent(false);
    setPendingUpload(null);
  }, [doUpload, pendingUpload]);

  const onConsentDecline = useCallback(() => {
    setShowConsent(false);
    setPendingUpload(null);
    // 不 grantConsent —— 下次 paste 还会再问；本次 paste 留在本地
  }, []);

  return (
    <div
      className="relative min-h-screen"
      style={{
        backgroundColor: '#0a0510', // 防 ArcadeBackground 渐变间隙露黑
        color: '#f5e9c8', // 默认文字 → 米黄
      }}
    >
      <ConsentModal open={showConsent} onAccept={onConsentAccept} onDecline={onConsentDecline} />
      <ArcadeBackground />
      <ArcadeHeader
        status={pet ? `PROFILE_LOADED · ${pet.name.toUpperCase()}` : 'AWAITING_INPUT_'}
      />

      <main className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12 pt-10 pb-20">
        {/* ───────── INCOMING CHALLENGE —— 应战流程提示 ───────── */}
        {returnTo && (
          <section
            className="boot-stagger mb-6 flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            aria-label="accepting challenge"
            style={{
              border: '1px solid rgba(255,215,0,0.55)',
              background:
                'linear-gradient(90deg, rgba(255,215,0,0.12) 0%, rgba(20,12,8,0.6) 100%)',
              boxShadow: '0 0 28px rgba(255,215,0,0.22)',
            }}
          >
            <span
              className="text-[10px] tracking-[0.4em] uppercase"
              style={{ color: '#ffd700', textShadow: '0 0 8px rgba(255,215,0,0.4)' }}
            >
              ✦ incoming challenge · paste your pet to return to the arena
            </span>
            <span
              className="text-[9px] tracking-[0.3em] uppercase"
              style={{ color: 'rgba(212,175,55,0.5)' }}
            >
              auto-redirect on success
            </span>
          </section>
        )}

        {/* ───────── RETURNING COMBATANT —— 第二次访问的快捷入口 ───────── */}
        {savedPetId && !returnTo && (
          <section
            className="boot-stagger mb-8 flex flex-wrap items-center justify-between gap-4 px-5 py-4"
            aria-label="returning combatant quick entry"
            style={{
              border: '1px solid rgba(212,175,55,0.4)',
              background:
                'linear-gradient(90deg, rgba(212,175,55,0.08) 0%, rgba(20,12,8,0.45) 100%)',
              boxShadow: '0 0 24px rgba(212,175,55,0.18)',
            }}
          >
            <div className="flex items-baseline gap-3 flex-wrap">
              <span
                className="text-[10px] tracking-[0.4em] uppercase"
                style={{ color: 'rgba(212,175,55,0.7)' }}
              >
                ✦ welcome back · arena run active
              </span>
              <span
                className="text-[10px] tracking-[0.3em] uppercase tabular-nums"
                style={{ color: 'rgba(212,175,55,0.4)' }}
              >
                id::{savedPetId}
              </span>
            </div>
            <a
              href="/v-arcade/battle"
              className="glow-hover px-6 py-2.5 text-[11px] tracking-[0.3em] uppercase"
              style={{
                color: '#0a0510',
                background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                border: '1px solid #ffd700',
                fontWeight: 700,
                boxShadow: '0 0 18px rgba(212,175,55,0.4)',
                textDecoration: 'none',
              }}
            >
              ↳ ENTER THE ARENA
            </a>
          </section>
        )}

        {/* ───────── HERO ───────── */}
        <section className="boot-stagger grid grid-cols-12 gap-y-1 mb-8 lg:mb-10">
          <p
            className="col-span-12 text-[10px] tracking-[0.4em] uppercase"
            style={{ color: 'rgba(212,175,55,0.4)' }}
          >
            // 0x0001 · Arcade Edition · TCG Frame
          </p>
          <h1
            className="col-span-12 lg:col-span-9 font-vt leading-[0.85] mt-2 text-[clamp(56px,8vw,108px)]"
            style={{
              color: '#ffd700',
              textShadow:
                '0 0 24px rgba(255,215,0,0.5), 0 0 60px rgba(212,175,55,0.3)',
            }}
          >
            LLM PET
            <br />
            ARENA
            <span style={{ color: '#ffe082' }}>.</span>
          </h1>
          <div
            className="col-span-12 lg:col-span-3 lg:text-right flex flex-col gap-3 justify-end pb-2 mt-4 lg:mt-0 lg:border-l lg:border-dashed lg:pl-4"
            style={{ borderColor: 'rgba(212,175,55,0.18)' }}
          >
            <DashRow k="schema" v="v1 · 6 stats · 3 factions" />
            <DashRow k="elements" v="火 / 水 / 土 / 雷 / 暗 / 金" />
            <DashRow k="build" v="v0.1.0" />
            <DashRow
              k="status"
              v={pet ? '▸ profile active' : '▸ awaiting json'}
              color={pet ? '#f5e9c8' : '#ffd700'}
            />
          </div>
          <div
            className="col-span-12 border-t border-dashed mt-6 pt-3 flex flex-wrap justify-between gap-3 tracking-wider"
            style={{ borderColor: 'rgba(212,175,55,0.18)' }}
          >
            <span className="text-sm" style={{ color: '#f5e9c8' }}>
              Your AI knows you. Now meet your pet.
            </span>
            <span className="text-xs" style={{ color: 'rgba(212,175,55,0.4)' }}>
              // 让你常用的 LLM 给你一只独属的对战宠物
            </span>
          </div>
        </section>

        {/* ───────── BODY: 2-col on lg ───────── */}
        <section className="boot-stagger grid grid-cols-12 gap-x-8 gap-y-12">
          {/* LEFT · controls — 用父级 inline 覆盖 --c-* CSS 变量，让 PromptBlock/JsonPaster 子树自动翻金 */}
          <div
            className="col-span-12 lg:col-span-7 flex flex-col gap-8"
            style={{
              // 作用域 CSS variable override：仅此子树生效
              ['--c-line' as string]: 'rgba(212,175,55,0.3)',
              ['--c-line-dim' as string]: 'rgba(212,175,55,0.15)',
              ['--c-line-hot' as string]: 'rgba(255,215,0,0.55)',
              ['--c-bg-surface' as string]: 'rgba(20,12,8,0.45)',
              ['--c-text' as string]: '#f5e9c8',
              ['--c-text-bright' as string]: '#ffe082',
              ['--c-text-dim' as string]: 'rgba(212,175,55,0.5)',
              ['--c-amber' as string]: '#ffd700',
              ['--c-red' as string]: '#e57373',
            }}
          >
            <Chapter num="01" word="acquire" title="copy prompt to claude">
              <PromptBlock />
            </Chapter>

            <Chapter num="02" word="render" title="paste llm output">
              <JsonPaster onParsed={setPet} onUploadable={handleUploadable} />
            </Chapter>
          </div>

          {/* RIGHT · card stage — container-query 缩放，pet null/defined 切换不抖 */}
          <div className="col-span-12 lg:col-span-5">
            <div
              className="flex items-baseline justify-between border-b border-dashed pb-2 mb-6"
              style={{ borderColor: 'rgba(212,175,55,0.18)' }}
            >
              <span
                className="text-[10px] tracking-[0.3em] uppercase"
                style={{ color: 'rgba(212,175,55,0.5)' }}
              >
                {pet ? '// your specimen' : '// pack · unopened'}
              </span>
              <span
                className="text-[10px] tracking-[0.3em] uppercase tabular-nums"
                style={{ color: 'rgba(212,175,55,0.4)' }}
              >
                {pet ? `id::${pet.pet_id}` : 'seal::intact'}
              </span>
            </div>

            <div className="flex flex-col items-center">
              {/* container-query 容器：声明 inline-size 让 100cqw 单位生效 */}
              <div
                className="relative w-full max-w-[460px]"
                style={{ containerType: 'inline-size' }}
              >
                {/* 辉光环 — Arcade 戏剧化装饰 */}
                <div
                  aria-hidden
                  className="absolute pointer-events-none"
                  style={{
                    inset: '-20px',
                    borderRadius: '32px',
                    background:
                      'radial-gradient(ellipse at center, rgba(212,175,55,0.18) 0%, transparent 70%)',
                  }}
                />
                {/* aspect-ratio 舞台框 */}
                <div
                  className="relative overflow-hidden"
                  style={{
                    width: '100%',
                    aspectRatio: '1080 / 1350',
                    borderRadius: '20px',
                    boxShadow:
                      '0 30px 90px rgba(0,0,0,0.85), 0 0 40px rgba(212,175,55,0.18)',
                  }}
                >
                  {/* 1080×1350 原生 + cqw 缩放
                      transform = scale(100cqw / 1080px) = scale(<length>/<length>) = scale(<number>)
                      ⚠ cardRef 必须挂在 transform layer 内部，不能挂在带 scale 的节点上
                         （否则 cloneNode 后 clone 自身仍带 scale，html2canvas 截图会被压在左上角） */}
                  <div
                    style={{
                      width: '1080px',
                      height: '1350px',
                      transformOrigin: 'top left',
                      transform: 'scale(calc(100cqw / 1080px))',
                    }}
                  >
                    <div ref={cardRef}>
                      {pet ? <ArcadeCard pet={pet} /> : <PetCardBack />}
                    </div>
                  </div>
                </div>
              </div>

              {pet && (
                <div
                  className="mt-6 flex flex-col items-center gap-2"
                  style={{
                    // 给 ExportButton 子树翻金，复用 CSS var override 套路
                    ['--c-line' as string]: 'rgba(212,175,55,0.4)',
                    ['--c-text-bright' as string]: '#f5e9c8',
                    ['--c-amber' as string]: '#ffd700',
                    ['--c-red' as string]: '#e57373',
                  }}
                >
                  <ExportButton targetRef={cardRef} pet={pet} filename={`${pet.pet_id}.png`} />
                  <span
                    className="text-[10px] tracking-[0.3em] uppercase"
                    style={{ color: 'rgba(212,175,55,0.4)' }}
                  >
                    out · 1080 × 1350 · png · 2× scale
                  </span>

                  {/* ENTER ARENA —— v-arcade battle entry */}
                  <a
                    href="/v-arcade/battle"
                    className="mt-3 inline-block px-6 py-2.5 text-[11px] tracking-[0.3em] uppercase"
                    style={{
                      color: '#0a0510',
                      background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                      border: '1px solid #ffd700',
                      fontWeight: 700,
                      boxShadow: '0 0 18px rgba(212,175,55,0.4)',
                      textDecoration: 'none',
                    }}
                  >
                    ↳ ENTER THE ARENA
                  </a>
                  <span
                    className="text-[10px] tracking-[0.3em] uppercase"
                    style={{ color: 'rgba(212,175,55,0.3)' }}
                  >
                    challenge other pets · build a streak
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ───────── FOOTER · Arcade thin strip ───────── */}
      <footer
        className="relative z-10 mt-10"
        style={{
          padding: '12px 32px',
          borderTop: '1px solid rgba(212,175,55,0.18)',
          fontSize: '10px',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: 'rgba(212,175,55,0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          background: 'rgba(8, 4, 14, 0.4)',
        }}
      >
        <span>// public pool · evidence local-only</span>
        <span style={{ color: 'rgba(245,233,200,0.3)' }}>
          arcade · tcg · design exploration · 2026
        </span>
      </footer>
    </div>
  );
}

// chapter 编号 + 装饰线 + 标题 — Arcade 配色版
function Chapter({
  num,
  word,
  title,
  children,
}: {
  num: string;
  word: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-6">
      <div
        aria-hidden
        className="absolute left-0 top-1 bottom-0 w-px"
        style={{
          background:
            'linear-gradient(to bottom, rgba(212,175,55,0.4), rgba(212,175,55,0.1), transparent)',
        }}
      />
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="font-vt leading-none text-[64px]"
          style={{
            color: '#ffd700',
            textShadow: '0 0 12px currentColor',
          }}
        >
          {num}
        </span>
        <span
          className="text-[10px] tracking-[0.35em] uppercase"
          style={{ color: 'rgba(212,175,55,0.5)' }}
        >
          // {word}
        </span>
      </div>
      <h2
        className="text-sm tracking-[0.2em] uppercase mb-4"
        style={{ color: '#f5e9c8' }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

// hero 右上 mini-dashboard 单行：// key  value
function DashRow({ k, v, color }: { k: string; v: string; color?: string }) {
  return (
    <div className="flex items-baseline gap-2 lg:justify-end">
      <span
        className="text-[10px] tracking-[0.3em] uppercase whitespace-nowrap"
        style={{ color: 'rgba(212,175,55,0.5)' }}
      >
        // {k}
      </span>
      <span
        className="text-xs tracking-[0.2em] uppercase tabular-nums"
        style={{ color: color ?? '#f5e9c8' }}
      >
        {v}
      </span>
    </div>
  );
}
