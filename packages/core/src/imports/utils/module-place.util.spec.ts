import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { placeOf } from './module-place.util.ts';
import type { ModuleResolveContext, ModuleTarget, WorkspaceTarget } from '../common/module-graph.type.ts';
import { A_DIR, B_DIR, C_DIR, Y_DIR } from '../test/common/module-dirs.const.ts';
import { contextOf, targetOf } from '../test/utils/module-context.spec.util.ts';

type PlaceRow = {
  readonly label: string;
  readonly walked: string[];
  readonly path: string;
  readonly patch: Partial<ModuleResolveContext>;
  readonly target: ModuleTarget;
};

const UNRESOLVED: ModuleTarget = { kind: 'unresolved' };
const ASSETS: ModuleTarget = { kind: 'assets' };
const OUTSIDE = resolve('/ws/z/q.ts');
/** `/ws/x/ab/i.css`: starts with the text of `A_DIR` but lies outside it, so no package owns it (not `assets`). */
const PREFIX_TWIN = join(`${A_DIR}b`, 'i.css');
const ROOT_PACKAGE: WorkspaceTarget = { name: '//', names: ['//'], dir: null };

const NESTED_B: Partial<ModuleResolveContext> = { others: [targetOf(B_DIR, 'b')] };
const ANCESTOR_A: Partial<ModuleResolveContext> = { dir: B_DIR, others: [targetOf(A_DIR, 'a')] };
const NESTED_B_C: Partial<ModuleResolveContext> = { others: [targetOf(B_DIR, 'b'), targetOf(C_DIR, 'c')] };
const SIBLING_Y: Partial<ModuleResolveContext> = { others: [targetOf(Y_DIR, 'y')] };
const ROOT_ONLY: Partial<ModuleResolveContext> = { others: [ROOT_PACKAGE] };

const fileOf = (file: string): ModuleTarget => {
  const target: ModuleTarget = { kind: 'file', file };

  return target;
};

const stubOf = (name: string): ModuleTarget => {
  const target: ModuleTarget = { kind: 'stub', name };

  return target;
};

const inA = (path: string): string => join(A_DIR, path);

const ROWS: PlaceRow[] = [
  { label: '`.js` swaps to `.ts`', walked: ['src/a.ts'], path: inA('src/a.js'), patch: {}, target: fileOf('src/a.ts') },
  {
    label: '`a.js` and `a.ts` both exist',
    walked: ['src/a.js', 'src/a.ts'],
    path: inA('src/a.js'),
    patch: {},
    target: fileOf('src/a.ts')
  },
  { label: '`.js` swaps to `.tsx`', walked: ['src/a.tsx'], path: inA('src/a.js'), patch: {}, target: fileOf('src/a.tsx') },
  { label: '`.mjs` swaps to `.mts`', walked: ['src/a.mts'], path: inA('src/a.mjs'), patch: {}, target: fileOf('src/a.mts') },
  { label: '`.jsx` swaps to `.tsx`', walked: ['src/a.tsx'], path: inA('src/a.jsx'), patch: {}, target: fileOf('src/a.tsx') },
  { label: '`.cjs` swaps to `.cts`', walked: ['src/a.cts'], path: inA('src/a.cjs'), patch: {}, target: fileOf('src/a.cts') },
  {
    label: 'a dir resolves to its index',
    walked: ['src/lib/index.ts'],
    path: inA('src/lib'),
    patch: {},
    target: fileOf('src/lib/index.ts')
  },
  { label: 'the package dir resolves to its index', walked: ['index.ts'], path: A_DIR, patch: {}, target: fileOf('index.ts') },
  {
    label: '`a.service` adds a suffix',
    walked: ['src/a.service.ts'],
    path: inA('src/a.service'),
    patch: {},
    target: fileOf('src/a.service.ts')
  },
  { label: 'an exact walked `.js` file', walked: ['src/a.js'], path: inA('src/a.js'), patch: {}, target: fileOf('src/a.js') },
  { label: 'a path escapes every package', walked: [], path: OUTSIDE, patch: {}, target: UNRESOLVED },
  { label: 'a sibling dir that shares the name prefix', walked: [], path: PREFIX_TWIN, patch: {}, target: UNRESOLVED },
  { label: 'a path into a nested package', walked: [], path: join(B_DIR, 'src/x.ts'), patch: NESTED_B, target: stubOf('b') },
  { label: 'an ancestor package', walked: ['src/x.ts'], path: join(B_DIR, 'src/x.ts'), patch: ANCESTOR_A, target: fileOf('src/x.ts') },
  { label: 'nested a ⊃ b ⊃ c, deepest owner', walked: [], path: join(C_DIR, 'i.ts'), patch: NESTED_B_C, target: stubOf('c') },
  { label: 'a sibling package', walked: [], path: join(Y_DIR, 'src/i.ts'), patch: SIBLING_Y, target: stubOf('y') },
  { label: 'the root package `//` never owns a path', walked: [], path: OUTSIDE, patch: ROOT_ONLY, target: UNRESOLVED },
  { label: 'a `.css` miss', walked: [], path: inA('src/a.css'), patch: {}, target: ASSETS },
  { label: 'a `.service` miss', walked: [], path: inA('src/a.service'), patch: {}, target: UNRESOLVED },
  { label: 'exact case only', walked: ['src/A.ts'], path: inA('src/a.ts'), patch: {}, target: UNRESOLVED }
];

describe('FEATURE: place an absolute import path', () => {
  describe('GIVEN package a at /ws/x/a', () => {
    it.each(ROWS)('WHEN $label THEN the path is placed', ({ walked, path, patch, target }) => {
      const context = contextOf(walked, patch);

      const placed = placeOf(path, context);

      expect(placed).toStrictEqual(target);
    });
  });

  describe('GIVEN package a at C:\\ws\\a with a nested package p', () => {
    it.runIf(process.platform === 'win32')(
      'WHEN win32 dirs are placed THEN the file is found by its posix path and a nested dir is a stub',
      () => {
        const context = contextOf(['src/b.ts'], { dir: 'C:\\ws\\a', others: [targetOf('C:\\ws\\a\\plugins\\p', 'p')] });

        expect(placeOf('C:\\ws\\a\\src\\b', context)).toStrictEqual({ kind: 'file', file: 'src/b.ts' });
        expect(placeOf('C:\\ws\\a\\plugins\\p\\i.ts', context)).toStrictEqual({ kind: 'stub', name: 'p' });
      }
    );
  });
});
