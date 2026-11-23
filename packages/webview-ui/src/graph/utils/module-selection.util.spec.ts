import { describe, expect, it } from 'vitest';

import { freshModulesViewOf } from './fresh-view-state.util.ts';
import { keptViewOf } from './module-selection.util.ts';
import type { ModuleSelection, ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';
import { MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';

const FRESH: ModulesViewState = freshModulesViewOf('web');

const VIEW: ModulesViewState = { ...FRESH, expanded: ['src'], depth: 2 };

const node = (id: string): ModuleSelection => {
  const selection: ModuleSelection = { kind: 'node', id };

  return selection;
};

const link = (source: string, target: string): ModuleSelection => {
  const selection: ModuleSelection = { kind: 'link', source, target };

  return selection;
};

describe('FEATURE: keptViewOf', () => {
  describe('GIVEN a saved selection and a new answer of six files and stubs @s/x, @s/y', () => {
    it.each<[string, ModuleSelection, ModuleSelection | null]>([
      ['a listed file', node('file:src/lib/b.ts'), node('file:src/lib/b.ts')],
      ['a listed test file', node('file:src/a.spec.ts'), node('file:src/a.spec.ts')],
      ['a file the answer dropped', node('file:src/gone.ts'), null],
      ['a listed stub', node('pkg:@s/x'), node('pkg:@s/x')],
      ['a stub the answer dropped', node('pkg:@s/gone'), null],
      ['a link into a folder with a file under it', link('file:index.ts', 'dir:src/lib'), link('file:index.ts', 'dir:src/lib')],
      ['a link into a prefix of a folder name, src/l', link('file:index.ts', 'dir:src/l'), null],
      ['a link with both ends held', link('file:src/a.ts', 'dir:src/lib'), link('file:src/a.ts', 'dir:src/lib')],
      ['a link to a dropped stub', link('file:src/a.ts', 'pkg:@s/gone'), null],
      ['a link from a dropped folder', link('dir:src/gone', 'file:src/a.ts'), null]
    ])('WHEN the selection is %s THEN it reads %j after the answer', (_name, selected, expected) => {
      expect(keptViewOf({ ...VIEW, selected }, MODULES_FOUND_STUB)).toStrictEqual({ ...VIEW, selected: expected });
    });
  });

  describe('GIVEN a saved focus and a new answer of six files and stubs @s/x, @s/y', () => {
    it.each<[string, string, string | null]>([
      ['a listed file', 'file:src/a.ts', 'file:src/a.ts'],
      ['a file the answer dropped', 'file:src/gone.ts', null],
      ['a listed stub', 'pkg:@s/y', 'pkg:@s/y'],
      ['a stub the answer dropped', 'pkg:@s/z', null]
    ])('WHEN the focus is %s THEN it reads %j after the answer', (_name, focus, expected) => {
      expect(keptViewOf({ ...VIEW, focus }, MODULES_FOUND_STUB)).toStrictEqual({ ...VIEW, focus: expected });
    });
  });

  describe('GIVEN a saved selection and focus the new answer both dropped', () => {
    it('WHEN both the selection and the focus are gone THEN both read null and the expansion, shown kinds, camera and depth are kept', () => {
      const view = { ...VIEW, selected: node('file:src/gone.ts'), focus: 'pkg:@s/z' };

      expect(keptViewOf(view, MODULES_FOUND_STUB)).toStrictEqual({ ...VIEW, selected: null, focus: null });
    });
  });
});
