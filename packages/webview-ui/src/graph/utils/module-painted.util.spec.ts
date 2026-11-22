import { describe, expect, it } from 'vitest';

import { paintedAfterRedrawOf } from './module-painted.util.ts';
import { moduleSceneOf } from './module-scene.util.ts';
import { moduleTreeOf } from './module-tree.util.ts';
import type { ModuleScene, ModuleShown } from '../common/module-scene.type.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';

const TREE = moduleTreeOf(MODULES_FOUND_STUB.files);

const NO_TESTS: ModuleShown = { ...ALL_SHOWN_STUB, tests: false };

const sceneOf = (expanded: string[], shown: ModuleShown = ALL_SHOWN_STUB): ModuleScene =>
  moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded, shown });

const SRC_OPEN = sceneOf(['src']);

const LIB_OPEN = sceneOf(['src', 'src/lib']);

const ROOT_ONLY = sceneOf([]);

describe('FEATURE: paintedAfterRedrawOf', () => {
  describe('GIVEN nothing painted', () => {
    it('WHEN src/lib is opened THEN nothing is painted', () => {
      expect(paintedAfterRedrawOf(null, SRC_OPEN, LIB_OPEN)).toBeNull();
    });
  });

  describe('GIVEN a.ts painted with src open', () => {
    it('WHEN src/lib is opened THEN a.ts stays painted', () => {
      expect(paintedAfterRedrawOf('file:src/a.ts', SRC_OPEN, LIB_OPEN)).toBe('file:src/a.ts');
    });

    it('WHEN src is closed THEN the src card that now holds it is painted', () => {
      expect(paintedAfterRedrawOf('file:src/a.ts', SRC_OPEN, ROOT_ONLY)).toBe('dir:src');
    });
  });

  describe('GIVEN b.ts painted inside src/lib', () => {
    it('WHEN src/lib is closed THEN the src/lib card is painted', () => {
      expect(paintedAfterRedrawOf('file:src/lib/b.ts', LIB_OPEN, SRC_OPEN)).toBe('dir:src/lib');
    });

    it('WHEN src is closed over it THEN the src card that now holds src/lib and b.ts is painted', () => {
      expect(paintedAfterRedrawOf('file:src/lib/b.ts', LIB_OPEN, ROOT_ONLY)).toBe('dir:src');
    });
  });

  describe('GIVEN the src/lib card painted', () => {
    it('WHEN src/lib opens into a box THEN nothing is painted, as a box takes no paint', () => {
      expect(paintedAfterRedrawOf('dir:src/lib', SRC_OPEN, LIB_OPEN)).toBeNull();
    });
  });

  describe('GIVEN the test file a.spec.ts painted', () => {
    it('WHEN test files are hidden THEN nothing is painted', () => {
      expect(paintedAfterRedrawOf('file:src/a.spec.ts', SRC_OPEN, sceneOf(['src'], NO_TESTS))).toBeNull();
    });
  });

  describe('GIVEN the stub @s/x painted', () => {
    it('WHEN src/lib is opened THEN @s/x stays painted', () => {
      expect(paintedAfterRedrawOf('pkg:@s/x', SRC_OPEN, LIB_OPEN)).toBe('pkg:@s/x');
    });
  });

  describe('GIVEN a card painted and no scene drawn before', () => {
    it('WHEN a scene without it is drawn THEN nothing is painted', () => {
      expect(paintedAfterRedrawOf('file:src/lib/b.ts', null, SRC_OPEN)).toBeNull();
    });
  });
});
