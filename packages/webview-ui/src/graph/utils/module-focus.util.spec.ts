import { describe, expect, it } from 'vitest';

import { focusSetOf } from './module-focus.util.ts';
import type { ModulesShown } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleFocus } from '../common/module-scene.type.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';

type FocusRow = [files: number[], stubs: string[]];

const ALL: ModulesShown = ALL_SHOWN_STUB;

const byIndex = (left: number, right: number): number => left - right;

const setOf = (focus: ModuleFocus, shown: ModulesShown): FocusRow => {
  const { files, stubs } = focusSetOf(MODULES_FOUND_STUB, shown, focus);
  const fileList = [...files];
  const stubList = [...stubs];
  const row: FocusRow = [fileList.toSorted(byIndex), stubList.toSorted()];

  return row;
};

describe('FEATURE: focusSetOf', () => {
  describe('GIVEN the stub, indexes 0 index.ts, 1 a, 2 a.spec, 3 b, 4 c, 5 d', () => {
    it.each<[string, ModuleFocus, ModulesShown, FocusRow]>([
      ['b at depth 1', { target: 'file:src/lib/b.ts', depth: 1 }, ALL, [[1, 3, 4, 5], ['@s/x']]],
      ['b at depth 2', { target: 'file:src/lib/b.ts', depth: 2 }, ALL, [[0, 1, 2, 3, 4, 5], ['@s/x']]],
      [
        'b at depth 2, test files hidden',
        { target: 'file:src/lib/b.ts', depth: 2 },
        { ...ALL, tests: false },
        [[0, 1, 3, 4, 5], ['@s/x']]
      ],
      ['a at depth 1, importers and imports both', { target: 'file:src/a.ts', depth: 1 }, ALL, [[0, 1, 2, 3, 4], []]],
      ['the stub @s/x at depth 1', { target: 'pkg:@s/x', depth: 1 }, ALL, [[3], ['@s/x']]],
      ['the stub @s/x at depth 2, through it', { target: 'pkg:@s/x', depth: 2 }, ALL, [[1, 3, 4, 5], ['@s/x']]],
      [
        'b at depth 1, type-only hidden (b → c is type-only)',
        { target: 'file:src/lib/b.ts', depth: 1 },
        { ...ALL, types: false },
        [[1, 3, 5], ['@s/x']]
      ],
      [
        'a at depth 1, lazies hidden (a → c is lazy)',
        { target: 'file:src/a.ts', depth: 1 },
        { ...ALL, lazies: false },
        [[0, 1, 2, 3], []]
      ],
      [
        'the test target a.spec while test files are hidden',
        { target: 'file:src/a.spec.ts', depth: 1 },
        { ...ALL, tests: false },
        [[1, 2], ['@s/y']]
      ],
      ['a target the payload lacks', { target: 'file:src/gone.ts', depth: 1 }, ALL, [[], []]]
    ])('WHEN the focus is %s THEN its files and stubs are the hand-derived set', (_name, focus, shown, expected) => {
      expect(setOf(focus, shown)).toStrictEqual(expected);
    });
  });
});
