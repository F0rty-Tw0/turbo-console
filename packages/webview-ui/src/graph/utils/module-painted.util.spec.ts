import { describe, expect, it } from 'vitest';

import { heldOf, keepsSelection, paintTargetOf } from './module-painted.util.ts';
import { moduleSceneOf } from './module-scene.util.ts';
import { moduleTreeOf } from './module-tree.util.ts';
import type { ModuleSelection } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleBox, ModuleDirLeaf, ModuleScene, ModuleShown } from '../common/module-scene.type.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';
import { link, node } from '../test/utils/module-selections.spec.util.ts';

/** Whether the choice is kept, and what it paints. */
type KeptAndTarget = [boolean, ModuleSelection | null];

const TREE = moduleTreeOf(MODULES_FOUND_STUB.files);

const NO_TESTS: ModuleShown = { ...ALL_SHOWN_STUB, tests: false };

const NO_TYPES: ModuleShown = { ...ALL_SHOWN_STUB, types: false };

const sceneOf = (expanded: string[], shown: ModuleShown = ALL_SHOWN_STUB): ModuleScene =>
  moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded, shown, focus: null });

const SRC_OPEN = sceneOf(['src']);

const LIB_OPEN = sceneOf(['src', 'src/lib']);

const LIB_OPEN_NO_TYPES = sceneOf(['src', 'src/lib'], NO_TYPES);

const ROOT_ONLY = sceneOf([]);

const SRC_OPEN_NO_TESTS = sceneOf(['src'], NO_TESTS);

const ROOT_ONLY_NO_TESTS = sceneOf([], NO_TESTS);

const ROOT_BOX: ModuleBox = { id: 'dir:', path: '', name: '', parent: null };

/** A folder card named like the stub `@s/x`'s scope, which a stub id must never walk up to. */
const AT_S_CARD: ModuleDirLeaf = { kind: 'dir', id: 'dir:@s', path: '@s', label: '@s/', fileCount: 1, parent: 'dir:' };

/** Only the `@s` folder card, and no stub drawn. */
const AT_S_ONLY: ModuleScene = { boxes: [ROOT_BOX], leaves: [AT_S_CARD], links: [], leafCount: 1, fileIds: ['file:@s/z.ts'] };

const B_ID = 'file:src/lib/b.ts';

const SPEC_ID = 'file:src/a.spec.ts';

describe('FEATURE: module painted', () => {
  describe('GIVEN the chosen b.ts inside src/lib', () => {
    it.each([
      ['src/lib is open', B_ID, LIB_OPEN],
      ['src/lib is closed', 'dir:src/lib', SRC_OPEN],
      ['src is closed', 'dir:src', ROOT_ONLY]
    ])('WHEN %s THEN %s holds it', (_, held, scene) => {
      expect(heldOf(B_ID, scene)).toBe(held);
    });

    it('WHEN src/lib is closed THEN the choice is kept', () => {
      expect(keepsSelection(node(B_ID), SRC_OPEN)).toBe(true);
    });

    it('WHEN src/lib is closed THEN the src/lib card is painted', () => {
      expect(paintTargetOf(node(B_ID), SRC_OPEN)).toStrictEqual(node('dir:src/lib'));
    });

    it('WHEN src/lib is open THEN b.ts itself is painted', () => {
      expect(paintTargetOf(node(B_ID), LIB_OPEN)).toStrictEqual(node(B_ID));
    });
  });

  describe('GIVEN the chosen src/lib card', () => {
    it('WHEN src/lib opens into a box THEN the box holds it', () => {
      expect(heldOf('dir:src/lib', LIB_OPEN)).toBe('dir:src/lib');
    });

    it('WHEN src/lib opens into a box THEN the choice is dropped, as a box takes no paint', () => {
      expect(keepsSelection(node('dir:src/lib'), LIB_OPEN)).toBe(false);
    });

    it('WHEN src/lib opens into a box THEN nothing is painted', () => {
      expect(paintTargetOf(node('dir:src/lib'), LIB_OPEN)).toBeNull();
    });
  });

  describe('GIVEN the chosen test file a.spec.ts', () => {
    it('WHEN test files are hidden THEN nothing holds it, as src around it is an open box', () => {
      expect(heldOf(SPEC_ID, SRC_OPEN_NO_TESTS)).toBeNull();
    });

    it('WHEN test files are hidden THEN the choice is dropped', () => {
      expect(keepsSelection(node(SPEC_ID), SRC_OPEN_NO_TESTS)).toBe(false);
    });

    it('WHEN test files are hidden and src is collapsed THEN nothing holds it, though the src card is drawn', () => {
      expect(heldOf(SPEC_ID, ROOT_ONLY_NO_TESTS)).toBeNull();
    });

    it('WHEN src is collapsed with test files shown THEN the src card holds it', () => {
      expect(heldOf(SPEC_ID, ROOT_ONLY)).toBe('dir:src');
    });
  });

  describe('GIVEN a file a Refresh removed from src', () => {
    it('WHEN src is collapsed THEN nothing holds it, though the src card is drawn', () => {
      expect(heldOf('file:src/gone.ts', ROOT_ONLY)).toBeNull();
    });
  });

  describe('GIVEN the chosen root file index.ts', () => {
    it('WHEN src is closed THEN it is kept and painted itself', () => {
      const sel = node('file:index.ts');

      expect([keepsSelection(sel, ROOT_ONLY), paintTargetOf(sel, ROOT_ONLY)]).toStrictEqual([true, sel]);
    });

    it('WHEN it is gone from the scene THEN nothing holds it, as no folder is around it', () => {
      expect(heldOf('file:gone.ts', ROOT_ONLY)).toBeNull();
    });
  });

  describe('GIVEN the chosen stub @s/x', () => {
    it('WHEN src/lib is opened while it is drawn THEN it is kept and painted itself', () => {
      const sel = node('pkg:@s/x');

      expect([keepsSelection(sel, LIB_OPEN), paintTargetOf(sel, LIB_OPEN)]).toStrictEqual([true, sel]);
    });

    it('WHEN it is not drawn and an @s folder card is THEN nothing holds it, as a stub has no folder around it', () => {
      expect(heldOf('pkg:@s/x', AT_S_ONLY)).toBeNull();
    });
  });

  describe('GIVEN the chosen stub @s/y, linked only from the test file', () => {
    it('WHEN test files are hidden THEN the choice is dropped', () => {
      expect(keepsSelection(node('pkg:@s/y'), SRC_OPEN_NO_TESTS)).toBe(false);
    });
  });

  describe('GIVEN a chosen link', () => {
    it.each<[string, KeptAndTarget, ModuleSelection, ModuleScene]>([
      ['both ends drawn as cards', [true, link('file:index.ts', 'file:src/a.ts')], link('file:index.ts', 'file:src/a.ts'), SRC_OPEN],
      ['one end folded into the src/lib card', [true, link('file:src/a.ts', 'dir:src/lib')], link('file:src/a.ts', B_ID), SRC_OPEN],
      ['both ends collapsed into one card', [true, node('dir:src/lib')], link(B_ID, 'file:src/lib/c.ts'), SRC_OPEN],
      ['one end opened into a box', [true, null], link('file:src/a.ts', 'dir:src/lib'), LIB_OPEN],
      ['its link hidden (b → c is type-only)', [true, null], link(B_ID, 'file:src/lib/c.ts'), LIB_OPEN_NO_TYPES],
      ['an end a hidden test file', [false, null], link(SPEC_ID, 'file:src/a.ts'), SRC_OPEN_NO_TESTS],
      ['an end gone', [false, null], link('file:src/gone.ts', 'file:src/a.ts'), ROOT_ONLY]
    ])('WHEN %s THEN kept and the paint target are %j', (_name, expected, sel, scene) => {
      expect([keepsSelection(sel, scene), paintTargetOf(sel, scene)]).toStrictEqual(expected);
    });
  });
});
