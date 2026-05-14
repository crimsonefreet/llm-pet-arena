import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pet Arena',
  description: '让你常用的 LLM 基于真实使用历史，生成一只独属于你的 AI 宠物。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="font-mono">{children}</body>
    </html>
  );
}
