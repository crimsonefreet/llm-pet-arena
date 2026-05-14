// 确定性 ASCII sprite：基于 pet_id 哈希选择模板 + 核心字符。
// 模板内 ${C} 占位符替换为核心字符（3 字符宽以保持对齐）。

const TEMPLATES: readonly string[] = [
  // 0. 机甲守卫
  `         .-=:=-.
       .'  ___  '.
      /   /   \\   \\
     |   | \${C} |   |
      \\   \\___/   /
       '.       .'
       /  \\   /  \\
      | / | | | \\ |
      |/  | | |  \\|
         _|_|_|_
        |||||||||`,
  // 1. 水晶核心
  `          ___
         /   \\
        / /\\  \\
       / /  \\  \\
      / /\\\${C}\\\\
      \\ \\/  /  /
       \\ \\  / /
        \\/\\ /
         \\V/
          ^`,
  // 2. 像素盒子
  `      .--------.
      | .------. |
      | | \${C}  | |
      | |      | |
      | '------' |
      |  o  o  o |
      '----------'
        | | | |
       ='-'-'-'=`,
  // 3. 卡通幽魂
  `        .---.
       /     \\
      |  o o  |
      |   \${C}   |
       \\  ^^^ /
        '---'
       /     \\
      (   .   )
       \\_____/
        ' ' '`,
];

const CORE_CHARS: readonly string[] = ['$@$', '#&#', '<*>', '@^@', '%$%', '+~+'];

// djb2 哈希——确定性，不同 pet_id 产生分散结果
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function generateAsciiSprite(petId: string): string {
  const h = hash(petId);
  const tpl = TEMPLATES[h % TEMPLATES.length];
  const core = CORE_CHARS[(h >>> 8) % CORE_CHARS.length];
  return tpl.replace('${C}', core);
}
