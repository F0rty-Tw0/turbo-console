import { describe, expect, it } from 'vitest';

import { defaultExpandedOf } from './module-expand.util.ts';
import { moduleTreeOf } from './module-tree.util.ts';

describe('FEATURE: default module expansion', () => {
  describe.each<[string, string[], string[]]>([
    ['the D9 example, src holding only lib', ['src/lib/a.ts', 'src/lib/b.ts'], ['src']],
    ['a fileless chain', ['src/a/b/c.ts'], ['src', 'src/a']],
    ['a fileless only child under a root with files', ['index.ts', 'src/lib/a.ts'], ['src']],
    ['an only child that holds files', ['src/a.ts', 'src/lib/b.ts'], []],
    ['two child folders', ['a/x.ts', 'b/y.ts'], []],
    ['a fileless only child under a collapsed folder', ['a/x.ts', 'b/c/y.ts'], []],
    ['files at the root only', ['a.ts'], []],
    ['no files', [], []]
  ])('GIVEN %s', (_name, files, expected) => {
    it('WHEN the default expansion is taken THEN it is those folders, parents first, the root never listed', () => {
      expect(defaultExpandedOf(moduleTreeOf(files))).toStrictEqual(expected);
    });
  });
});
