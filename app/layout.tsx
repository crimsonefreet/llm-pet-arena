import type { Metadata } from 'next';
import { JetBrains_Mono, VT323, Cinzel, Inter } from 'next/font/google';
import './globals.css';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
  display: 'swap',
});

// Cinzel — Arcade 卡牌 .petName / .loreText 使用的衬线大字
// 加载 weight 400/700/900，全 latin。
// next/font/google 自动注入 <link rel="preload"> + @font-face，
// canvas API 也能通过 document.fonts.load('700 72px Cinzel') 拿到同源字体。
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel',
  display: 'swap',
});

// Inter — Arcade .petTitle / 主类签 / faction label 等无衬线副文字
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LLM Pet Arena · Your AI knows you. Now meet your pet.',
  description: '让你常用的 LLM 基于真实使用历史，生成一只独属于你的 AI 宠物。',
  openGraph: {
    title: 'LLM Pet Arena',
    description: 'Your AI knows you. Now meet your pet.',
    type: 'website',
    siteName: 'LLM Pet Arena',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM Pet Arena',
    description: 'Your AI knows you. Now meet your pet.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className={`${jetbrains.variable} ${vt323.variable} ${cinzel.variable} ${inter.variable} font-mono`}>{children}</body>
    </html>
  );
}
