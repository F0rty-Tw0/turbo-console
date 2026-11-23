import { describe, expect, it } from 'vitest';

import { moduleSceneOf } from './module-scene.util.ts';
import { moduleTreeOf } from './module-tree.util.ts';
import type { ModuleFocus, ModuleScene, ModuleSceneLink, ModuleShown, ModuleStubLeaf } from '../common/module-scene.type.ts';
import type { ModuleTree } from '../common/module-tree.type.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';

type LinkRow = [source: string, target: string, statics: number, types: number, lazies: number];

const TREE: ModuleTree = moduleTreeOf(MODULES_FOUND_STUB.files);

const sceneOf = (focus: ModuleFocus | null, shown: ModuleShown = ALL_SHOWN_STUB): ModuleScene =>
  moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded: [], shown, focus });

const idsOf = (scene: ModuleScene): string[] => scene.leaves.map((leaf) => leaf.id);

const boxIdsOf = (scene: ModuleScene): string[] => scene.boxes.map((box) => box.id);

const rowOf = (link: ModuleSceneLink): LinkRow => [link.source, link.target, link.statics, link.types, link.lazies];

const B_FOCUS: ModuleFocus = { target: 'file:src/lib/b.ts', depth: 1 };

const A_FOCUS: ModuleFocus = { target: 'file:src/a.ts', depth: 1 };

const Y_FOCUS: ModuleFocus = { target: 'pkg:@s/y', depth: 1 };

const SPEC_FOCUS: ModuleFocus = { target: 'file:src/a.spec.ts', depth: 1 };

const Y_LEAF: ModuleStubLeaf = { kind: 'stub', id: 'pkg:@s/y', name: '@s/y', label: '@s/y', parent: null };

const NO_TYPES: ModuleShown = { ...ALL_SHOWN_STUB, types: false };

const NO_TESTS: ModuleShown = { ...ALL_SHOWN_STUB, tests: false };

describe('FEATURE: module scene with a focus', () => {
  describe('GIVEN b focused at depth 1 with nothing expanded', () => {
    const scene = sceneOf(B_FOCUS);

    it('WHEN the scene is built THEN the focus files ancestors are drawn open', () => {
      expect(boxIdsOf(scene)).toStrictEqual(['dir:', 'dir:src', 'dir:src/lib', 'dir:src/ui']);
    });

    it('WHEN the scene is built THEN index.ts and a.spec.ts are gone', () => {
      expect(idsOf(scene)).toStrictEqual(['file:src/lib/b.ts', 'file:src/lib/c.ts', 'file:src/ui/d.ts', 'file:src/a.ts', 'pkg:@s/x']);
    });

    it('WHEN the scene is built THEN only the links between focus nodes are drawn', () => {
      expect(scene.links.map(rowOf)).toStrictEqual([
        ['file:src/a.ts', 'file:src/lib/b.ts', 1, 1, 0],
        ['file:src/a.ts', 'file:src/lib/c.ts', 0, 0, 1],
        ['file:src/lib/b.ts', 'file:src/lib/c.ts', 0, 1, 0],
        ['file:src/ui/d.ts', 'file:src/lib/b.ts', 1, 0, 0],
        ['file:src/lib/b.ts', 'pkg:@s/x', 1, 0, 0]
      ]);
    });

    it('WHEN the scene is built THEN the file ids are the focus files in tree order', () => {
      expect(scene.fileIds).toStrictEqual(['file:src/a.ts', 'file:src/lib/b.ts', 'file:src/lib/c.ts', 'file:src/ui/d.ts']);
    });
  });

  describe('GIVEN a focused at depth 1', () => {
    const scene = sceneOf(A_FOCUS);

    it('WHEN the scene is built THEN the emptied src/ui is dropped', () => {
      expect(boxIdsOf(scene)).toStrictEqual(['dir:', 'dir:src', 'dir:src/lib']);
    });

    it('WHEN the scene is built THEN the stub links out of the focus are filtered out', () => {
      expect(idsOf(scene)).toStrictEqual([
        'file:src/lib/b.ts',
        'file:src/lib/c.ts',
        'file:src/a.spec.ts',
        'file:src/a.ts',
        'file:index.ts'
      ]);
    });
  });

  describe('GIVEN the stub @s/y focused at depth 1 with type-only imports hidden', () => {
    it('WHEN the scene is built THEN the target stub is drawn alone with no shown link', () => {
      const expected: ModuleScene = { boxes: [], leaves: [Y_LEAF], links: [], leafCount: 1, fileIds: [] };

      expect(sceneOf(Y_FOCUS, NO_TYPES)).toStrictEqual(expected);
    });
  });

  describe('GIVEN the test target a.spec.ts focused at depth 1 with test files hidden', () => {
    const scene = sceneOf(SPEC_FOCUS, NO_TESTS);

    it('WHEN the scene is built THEN the target, its import and its stub are drawn', () => {
      expect(idsOf(scene)).toStrictEqual(['file:src/a.spec.ts', 'file:src/a.ts', 'pkg:@s/y']);
    });

    it('WHEN the scene is built THEN the file ids hold the target', () => {
      expect(scene.fileIds).toContain('file:src/a.spec.ts');
    });
  });

  describe('GIVEN no focus', () => {
    it('WHEN src is expanded THEN every file and stub is drawn as without a focus', () => {
      const scene = moduleSceneOf(TREE, MODULES_FOUND_STUB, { expanded: ['src'], shown: ALL_SHOWN_STUB, focus: null });

      expect(idsOf(scene)).toStrictEqual([
        'dir:src/lib',
        'dir:src/ui',
        'file:src/a.spec.ts',
        'file:src/a.ts',
        'file:index.ts',
        'pkg:@s/x',
        'pkg:@s/y'
      ]);
    });
  });
});
