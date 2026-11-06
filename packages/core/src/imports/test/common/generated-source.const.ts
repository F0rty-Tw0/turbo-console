/**
 * `import` and `require` word tokens in one block, counted by hand from `GENERATED_BLOCK_LINES`:
 * `import` x4 (default, type, multi-line, `import()`) + `require()` x1 + `import.meta` x1 + `foo.require` x1.
 * The comments, the string `"import 'y'"` and the template text spell them too, but are not tokens.
 */
export const GENERATED_BLOCK_KEYWORDS = 7;

/** Counted forms in one block: default import, `import type`, multi-line named import, `export * from`, `import()`, `require()`. */
export const GENERATED_BLOCK_IMPORTS = 6;

/** Replaced by the block index, so every specifier is unique and checkable. */
export const GENERATED_BLOCK_MARK = '#';

export const GENERATED_BLOCK_LINES: string[] = [
  "import def from '@acme/lib/b#';",
  "import type { T as U } from '@acme/lib/b#/types';",
  'import {',
  '  alpha,',
  '  beta as gamma,',
  "} from '@acme/lib/b#/named';",
  "export * from '@acme/lib/b#/all';",
  "const lazy = import('@acme/lib/b#/lazy');",
  "const cjs = require('@acme/lib/b#/cjs');",
  "// import 'x' in a line comment",
  "/* import 'x' in a block comment */",
  'const quoted = "import \'y\'";',
  "const tpl = `plain ${quoted} import 'z'`;",
  "const re = /'/g;",
  'const half = (quoted.length) / 2;',
  "const prop = foo.require('z');",
  'const meta = import.meta.url;',
  'export const compute = (a: number, b: number): number => {',
  '  const sum = a + b;',
  '  const diff = a - b;',
  '  const product = a * b;',
  '  let total = 0;',
  '  for (let step = 0; step < 4; step += 1) {',
  '    total += sum * step;',
  '    if (total > product) {',
  '      total -= diff;',
  '    } else {',
  '      total += diff;',
  '    }',
  '  }',
  '  const items = [sum, diff, product, total];',
  '  const doubled = items.map((item) => item * 2);',
  "  const label = doubled.join(',');",
  '  if (label.length > 20) {',
  '    return total;',
  '  }',
  '  const ratio = total % 7;',
  '  const spread = { ...items, ratio };',
  '  const names = Object.keys(spread);',
  '  return ratio + names.length;',
  '};'
];
