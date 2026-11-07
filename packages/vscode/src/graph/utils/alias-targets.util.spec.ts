import { describe, expect, it } from 'vitest';

import { aliasTargetsOf } from './alias-targets.util.ts';

type AliasRow = {
  readonly label: string;
  readonly paths: Record<string, string[]>;
  readonly specifier: string;
  readonly targets: string[];
};

const EXACT: Record<string, string[]> = { '@b': ['b/index.ts'] };
const WILDCARD: Record<string, string[]> = { '@b/*': ['b/src/*', 'b/lib/*'] };
const NESTED: Record<string, string[]> = { '@b/*': ['b/src/*'], '@b/ui/*': ['ui/*'] };
const TIED: Record<string, string[]> = { '@b/*': ['one/*'], '@b/*x': ['two/*'] };
const SUFFIXED: Record<string, string[]> = { 'icons/*.svg': ['assets/*.svg'] };
const OVERLAPPING: Record<string, string[]> = { 'a*a': ['x/*'] };
const ONE_TARGET: Record<string, string[]> = { '@b/*': ['b/*'] };
const CATCH_ALL: Record<string, string[]> = { '*': ['src/*'], '@b': ['b'] };
const STARRED_EXACT: Record<string, string[]> = { '@b': ['b/*'] };
const FIXED: Record<string, string[]> = { '@b/*': ['b/fixed.ts'] };

const ROWS: AliasRow[] = [
  { label: 'an exact key', paths: EXACT, specifier: '@b', targets: ['b/index.ts'] },
  { label: 'an exact key and a longer specifier', paths: EXACT, specifier: '@b/x', targets: [] },
  { label: 'a wildcard key with two targets', paths: WILDCARD, specifier: '@b/x/y', targets: ['b/src/x/y', 'b/lib/x/y'] },
  { label: 'two wildcard keys, the longer prefix fits', paths: NESTED, specifier: '@b/ui/k', targets: ['ui/k'] },
  { label: 'two wildcard keys with equal prefixes', paths: TIED, specifier: '@b/zx', targets: ['one/zx'] },
  { label: 'a key with a suffix, the suffix fits', paths: SUFFIXED, specifier: 'icons/a.svg', targets: ['assets/a.svg'] },
  { label: 'a key with a suffix, the suffix differs', paths: SUFFIXED, specifier: 'icons/a.png', targets: [] },
  { label: 'a key whose prefix and suffix overlap', paths: OVERLAPPING, specifier: 'a', targets: [] },
  { label: 'a specifier named like an Object.prototype key', paths: ONE_TARGET, specifier: 'constructor', targets: [] },
  { label: 'a specifier holding $&', paths: ONE_TARGET, specifier: '@b/$&q', targets: ['b/$&q'] },
  { label: 'a catch-all and an exact key, the specifier is the exact key', paths: CATCH_ALL, specifier: '@b', targets: ['b'] },
  { label: 'a catch-all and an exact key, the specifier is bare', paths: CATCH_ALL, specifier: 'react', targets: ['src/react'] },
  { label: 'an exact key whose target holds a star', paths: STARRED_EXACT, specifier: '@b', targets: ['b/*'] },
  { label: 'a wildcard key whose target holds no star', paths: FIXED, specifier: '@b/x', targets: ['b/fixed.ts'] }
];

describe('FEATURE: tsconfig paths targets of a specifier', () => {
  describe('GIVEN paths keys and a specifier', () => {
    it.each(ROWS)('WHEN $label THEN the targets are $targets', ({ paths, specifier, targets }) => {
      const picked = aliasTargetsOf(specifier, paths);

      expect(picked).toStrictEqual(targets);
    });
  });
});
