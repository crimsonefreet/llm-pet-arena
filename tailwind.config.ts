import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['var(--font-jetbrains)', 'monospace'],
        vt: ['var(--font-vt323)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
