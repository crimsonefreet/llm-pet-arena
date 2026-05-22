import { describe, it, expect } from 'vitest';
import { CLAUDE_PROMPT } from '@/lib/prompt/claude';

describe('CLAUDE_PROMPT', () => {
  it('contains key data-collection sections', () => {
    expect(CLAUDE_PROMPT).toContain('recent_chats');
    expect(CLAUDE_PROMPT).toContain('conversation_search');
    expect(CLAUDE_PROMPT).toContain('LLM Pet Arena');
  });

  it('declares pure JSON output (no markdown fence)', () => {
    expect(CLAUDE_PROMPT).toContain('不要 markdown 围栏');
    expect(CLAUDE_PROMPT).toContain('faction_affinity');
    expect(CLAUDE_PROMPT).toContain('skills');
  });

  it('includes self-check steps', () => {
    expect(CLAUDE_PROMPT).toMatch(/自检/);
  });
});
