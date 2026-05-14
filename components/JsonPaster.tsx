'use client';

import { useState } from 'react';
import { parsePetJson } from '@/lib/pet/parse';
import type { Pet } from '@/lib/pet/schema';

interface Props {
  onParsed: (pet: Pet | null) => void;
}

export function JsonPaster({ onParsed }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const r = parsePetJson(e.target.value);
    if (r.ok) {
      setError(null);
      onParsed(r.pet);
      return;
    }
    if (r.kind === 'empty') {
      setError(null);
      onParsed(null); // 清空状态：恢复轮播
      return;
    }
    // 解析失败：不 onParsed(null)，保留上次有效 pet 让用户继续看
    const prefix = r.kind === 'json_error' ? '⚠ JSON' : '⚠ 字段校验';
    setError(`${prefix}: ${r.message}`);
  };

  return (
    <div className="w-full">
      <label className="block text-xs text-green-900 tracking-widest mb-2">
        // PASTE PET JSON HERE
      </label>
      <textarea
        onChange={handleChange}
        rows={12}
        spellCheck={false}
        aria-label="paste pet json"
        className="w-full bg-black border border-green-900 p-3 text-green-400 font-mono text-xs focus:outline-none focus:border-green-500 resize-y"
        placeholder='Paste LLM output here — markdown fences ```json``` are OK.'
      />
      {error && (
        <pre role="alert" className="mt-2 text-xs text-red-500 whitespace-pre-wrap">
          {error}
        </pre>
      )}
    </div>
  );
}
