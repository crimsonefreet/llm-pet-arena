import type { Metadata } from 'next';
import { JetBrains_Mono, VT323 } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'Pet Arena · Your AI knows you. Now meet your pet.',
  description: '让你常用的 LLM 基于真实使用历史，生成一只独属于你的 AI 宠物。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className={`${jetbrains.variable} ${vt323.variable} font-mono`}>{children}</body>
    </html>
  );
}
