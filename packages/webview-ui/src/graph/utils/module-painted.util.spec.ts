import { describe, expect, it } from 'vitest';

import { heldOf, keepsSelection, paintTargetOf } from './module-painted.util.ts';
import { moduleSceneOf } from './module-scene.util.ts';
import { moduleTreeOf } from './module-tree.util.ts';
import type { ModuleBox, ModuleDirLeaf, ModuleScene, ModuleShown } from '../common/module-scene.type.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';

const TREE = moduleTreeOf(MODULES_FOUND_STUB.files);

const NO_TESTS: ModuleShown = { ...ALL_SHOWN_STUB, tests: false };

const sceneOf = (expanded: string[], shown: ModuleShown = ALL_SHOWN_STUB): ModuleScene =>
  moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded, shown });

const SRC_OPEN = sceneOf(['src']);

const LIB_OPEN = sceneOf(['src', 'src/lib']);

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
      expect(keepsSelection(B_ID, SRC_OPEN)).toBe(true);
    });

    it('WHEN src/lib is closed THEN the src/lib card is painted', () => {
      expect(paintTargetOf(B_ID, SRC_OPEN)).toBe('dir:src/lib');
    });

    it('WHEN src/lib is open THEN b.ts itself is painted', () => {
      expect(paintTargetOf(B_ID, LIB_OPEN)).toBe(B_ID);
    });
  });

  describe('GIVEN the chosen src/lib card', () => {
    it('WHEN src/lib opens into a box THEN the box holds it', () => {
      expect(heldOf('dir:src/lib', LIB_OPEN)).toBe('dir:src/lib');
    });

    it('WHEN src/lib opens into a box THEN the choice is dropped, as a box takes no paint', () => {
      expect(keepsSelection('dir:src/lib', LIB_OPEN)).toBe(false);
    });

    it('WHEN src/lib opens into a box THEN nothing is painted', () => {
      expect(paintTargetOf('dir:src/lib', LIB_OPEN)).toBeNull();
    });
  });

  describe('GIVEN the chosen test file a.spec.ts', () => {
    it('WHEN test files are hidden THEN nothing holds it, as src around it is an open box', () => {
      expect(heldOf(SPEC_ID, SRC_OPEN_NO_TESTS)).toBeNull();
    });

    it('WHEN test files are hidden THEN the choice is dropped', () => {
      expect(keepsSelection(SPEC_ID, SRC_OPEN_NO_TESTS)).toBe(false);
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
      expect([keepsSelection('file:index.ts', ROOT_ONLY), paintTargetOf('file:index.ts', ROOT_ONLY)]).toStrictEqual([
        true,
        'file:index.ts'
      ]);
    });

    it('WHEN it is gone from the scene THEN nothing holds it, as no folder is around it', () => {
      expect(heldOf('file:gone.ts', ROOT_ONLY)).toBeNull();
    });
  });

  describe('GIVEN the chosen stub @s/x', () => {
    it('WHEN src/lib is opened while it is drawn THEN it is kept and painted itself', () => {
      expect([keepsSelection('pkg:@s/x', LIB_OPEN), paintTargetOf('pkg:@s/x', LIB_OPEN)]).toStrictEqual([true, 'pkg:@s/x']);
    });

    it('WHEN it is not drawn and an @s folder card is THEN nothing holds it, as a stub has no folder around it', () => {
      expect(heldOf('pkg:@s/x', AT_S_ONLY)).toBeNull();
    });
  });

  describe('GIVEN the chosen stub @s/y, linked only from the test file', () => {
    it('WHEN test files are hidden THEN the choice is dropped', () => {
      expect(keepsSelection('pkg:@s/y', SRC_OPEN_NO_TESTS)).toBe(false);
    });
  });
});
