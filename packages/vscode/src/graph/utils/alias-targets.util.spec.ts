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
const STAR_TARGET: Record<string, string[]> = { '@b/*': ['b/src/*/index.ts'] };

const ROWS: AliasRow[] = [
  { label: 'an exact key', paths: EXACT, specifier: '@b', targets: ['b/index.ts'] },
  { label: 'an exact key', paths: EXACT, specifier: '@b/x', targets: [] },
  { label: 'an exact key', paths: EXACT, specifier: '@@b', targets: [] },
  { label: 'a wildcard key with two targets', paths: WILDCARD, specifier: '@b/x/y', targets: ['b/src/x/y', 'b/lib/x/y'] },
  { label: 'two wildcard keys of unequal prefixes', paths: NESTED, specifier: '@b/ui/k', targets: ['ui/k'] },
  { label: 'two wildcard keys of equal prefixes', paths: TIED, specifier: '@b/zx', targets: ['one/zx'] },
  { label: 'a suffixed key', paths: SUFFIXED, specifier: 'icons/a.svg', targets: ['assets/a.svg'] },
  { label: 'a suffixed key', paths: SUFFIXED, specifier: 'icons/a.png', targets: [] },
  { label: 'a suffixed key with an empty star', paths: SUFFIXED, specifier: 'icons/.svg', targets: ['assets/*.svg'] },
  { label: 'a key whose prefix and suffix overlap', paths: OVERLAPPING, specifier: 'a', targets: [] },
  { label: 'a wildcard key', paths: ONE_TARGET, specifier: 'constructor', targets: [] },
  { label: 'a wildcard key', paths: ONE_TARGET, specifier: '@b/$&q', targets: ['b/$&q'] },
  { label: 'a wildcard key with an empty star', paths: STAR_TARGET, specifier: '@b/', targets: ['b/src/*/index.ts'] },
  { label: 'a catch-all and an exact key', paths: CATCH_ALL, specifier: '@b', targets: ['b'] },
  { label: 'a catch-all and an exact key', paths: CATCH_ALL, specifier: 'react', targets: ['src/react'] },
  { label: 'an exact key whose target holds a star', paths: STARRED_EXACT, specifier: '@b', targets: ['b/*'] },
  { label: 'a wildcard key whose target has no star', paths: FIXED, specifier: '@b/x', targets: ['b/fixed.ts'] }
];

describe('FEATURE: tsconfig paths targets of a specifier', () => {
  describe('GIVEN the tsconfig paths keys of A', () => {
    it.each(ROWS)('WHEN $specifier is picked from $label THEN the targets are $targets', ({ paths, specifier, targets }) => {
      const picked = aliasTargetsOf(specifier, paths);

      expect(picked).toStrictEqual(targets);
    });
  });
});
