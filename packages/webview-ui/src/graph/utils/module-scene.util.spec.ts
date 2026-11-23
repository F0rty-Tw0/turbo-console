import { describe, expect, it } from 'vitest';

import { moduleSceneOf } from './module-scene.util.ts';
import { moduleTreeOf } from './module-tree.util.ts';
import type { ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { ModuleScene, ModuleSceneLink, ModuleShown } from '../common/module-scene.type.ts';
import { ALL_SHOWN_STUB, MODULES_FOUND_STUB } from '../test/stubs/module-scene.stub.ts';

type LinkRow = [source: string, target: string, statics: number, types: number, lazies: number];

const sceneOf = (data: ModulesFound, expanded: string[], shown: ModuleShown = ALL_SHOWN_STUB): ModuleScene =>
  moduleSceneOf(moduleTreeOf(data.files), data, { expanded, shown, focus: null });

const idsOf = (scene: ModuleScene): string[] => scene.leaves.map((leaf) => leaf.id);

const boxIdsOf = (scene: ModuleScene): string[] => scene.boxes.map((box) => box.id);

const rowOf = (link: ModuleSceneLink): LinkRow => [link.source, link.target, link.statics, link.types, link.lazies];

const NO_TESTS: ModuleShown = { ...ALL_SHOWN_STUB, tests: false };

describe('FEATURE: module scene', () => {
  describe('GIVEN the stub with src expanded and every kind shown', () => {
    const scene = sceneOf(MODULES_FOUND_STUB, ['src']);

    it('WHEN the scene is built THEN the root and src are boxes', () => {
      expect(scene.boxes).toStrictEqual([
        { id: 'dir:', path: '', name: '', parent: null },
        { id: 'dir:src', path: 'src', name: 'src', parent: 'dir:' }
      ]);
    });

    it('WHEN the scene is built THEN the leaves are pre-order, folders before files, stubs last', () => {
      expect(scene.leaves).toStrictEqual([
        { kind: 'dir', id: 'dir:src/lib', path: 'src/lib', label: 'lib/', fileCount: 2, parent: 'dir:src' },
        { kind: 'dir', id: 'dir:src/ui', path: 'src/ui', label: 'ui/', fileCount: 1, parent: 'dir:src' },
        { kind: 'file', id: 'file:src/a.spec.ts', path: 'src/a.spec.ts', label: 'a.spec.ts', parent: 'dir:src' },
        { kind: 'file', id: 'file:src/a.ts', path: 'src/a.ts', label: 'a.ts', parent: 'dir:src' },
        { kind: 'file', id: 'file:index.ts', path: 'index.ts', label: 'index.ts', parent: 'dir:' },
        { kind: 'stub', id: 'pkg:@s/x', name: '@s/x', label: '@s/x', parent: null },
        { kind: 'stub', id: 'pkg:@s/y', name: '@s/y', label: '@s/y', parent: null }
      ]);
      expect(scene.leafCount).toBe(7);
    });

    it('WHEN the scene is built THEN links merge at the deepest drawn ends and the b → c self-pair is gone', () => {
      expect(scene.links.map(rowOf)).toStrictEqual([
        ['file:index.ts', 'file:src/a.ts', 1, 0, 0],
        ['file:src/a.ts', 'dir:src/lib', 1, 1, 1],
        ['file:src/a.spec.ts', 'file:src/a.ts', 1, 0, 0],
        ['dir:src/ui', 'dir:src/lib', 1, 0, 0],
        ['file:src/a.spec.ts', 'pkg:@s/y', 0, 1, 0],
        ['dir:src/lib', 'pkg:@s/x', 1, 0, 0]
      ]);
    });
  });

  describe('GIVEN the stub with only the root open', () => {
    const scene = sceneOf(MODULES_FOUND_STUB, []);

    it('WHEN the scene is built THEN src is one card holding all five of its files', () => {
      expect(boxIdsOf(scene)).toStrictEqual(['dir:']);
      expect(scene.leaves[0]).toStrictEqual({ kind: 'dir', id: 'dir:src', path: 'src', label: 'src/', fileCount: 5, parent: 'dir:' });
      expect(idsOf(scene)).toStrictEqual(['dir:src', 'file:index.ts', 'pkg:@s/x', 'pkg:@s/y']);
      expect(scene.links.map(rowOf)).toStrictEqual([
        ['file:index.ts', 'dir:src', 1, 0, 0],
        ['dir:src', 'pkg:@s/y', 0, 1, 0],
        ['dir:src', 'pkg:@s/x', 1, 0, 0]
      ]);
    });
  });

  describe('GIVEN src/lib listed as expanded while src is collapsed', () => {
    it('WHEN the scene is built THEN src/lib is not drawn and the scene equals the root-only one', () => {
      expect(sceneOf(MODULES_FOUND_STUB, ['src/lib'])).toStrictEqual(sceneOf(MODULES_FOUND_STUB, []));
    });
  });

  describe('GIVEN the stub with src and src/lib expanded and lazies hidden', () => {
    const scene = sceneOf(MODULES_FOUND_STUB, ['src', 'src/lib'], { ...ALL_SHOWN_STUB, lazies: false });

    it('WHEN the scene is built THEN src/lib is a nested box and the lazy-only a → c link is gone', () => {
      expect(boxIdsOf(scene)).toStrictEqual(['dir:', 'dir:src', 'dir:src/lib']);
      expect(idsOf(scene)).toStrictEqual([
        'file:src/lib/b.ts',
        'file:src/lib/c.ts',
        'dir:src/ui',
        'file:src/a.spec.ts',
        'file:src/a.ts',
        'file:index.ts',
        'pkg:@s/x',
        'pkg:@s/y'
      ]);
      expect(scene.links.map(rowOf)).toStrictEqual([
        ['file:index.ts', 'file:src/a.ts', 1, 0, 0],
        ['file:src/a.ts', 'file:src/lib/b.ts', 1, 1, 0],
        ['file:src/a.spec.ts', 'file:src/a.ts', 1, 0, 0],
        ['file:src/lib/b.ts', 'file:src/lib/c.ts', 0, 1, 0],
        ['dir:src/ui', 'file:src/lib/b.ts', 1, 0, 0],
        ['file:src/a.spec.ts', 'pkg:@s/y', 0, 1, 0],
        ['file:src/lib/b.ts', 'pkg:@s/x', 1, 0, 0]
      ]);
      expect(scene.leafCount).toBe(8);
    });
  });

  describe('GIVEN the stub with src expanded and type-only imports hidden', () => {
    const scene = sceneOf(MODULES_FOUND_STUB, ['src'], { ...ALL_SHOWN_STUB, types: false });

    it('WHEN the scene is built THEN types read 0 and the stub reached only by a type import is not drawn', () => {
      expect(scene.links.map(rowOf)).toStrictEqual([
        ['file:index.ts', 'file:src/a.ts', 1, 0, 0],
        ['file:src/a.ts', 'dir:src/lib', 1, 0, 1],
        ['file:src/a.spec.ts', 'file:src/a.ts', 1, 0, 0],
        ['dir:src/ui', 'dir:src/lib', 1, 0, 0],
        ['dir:src/lib', 'pkg:@s/x', 1, 0, 0]
      ]);
      expect(idsOf(scene)).not.toContain('pkg:@s/y');
      expect(scene.leafCount).toBe(6);
    });
  });

  describe('GIVEN the stub with test files hidden', () => {
    it('WHEN src is expanded THEN a.spec.ts, its links and the stub only it reached are gone', () => {
      const scene = sceneOf(MODULES_FOUND_STUB, ['src'], NO_TESTS);

      expect(idsOf(scene)).toStrictEqual(['dir:src/lib', 'dir:src/ui', 'file:src/a.ts', 'file:index.ts', 'pkg:@s/x']);
      expect(scene.links.map(rowOf)).toStrictEqual([
        ['file:index.ts', 'file:src/a.ts', 1, 0, 0],
        ['file:src/a.ts', 'dir:src/lib', 1, 1, 1],
        ['dir:src/ui', 'dir:src/lib', 1, 0, 0],
        ['dir:src/lib', 'pkg:@s/x', 1, 0, 0]
      ]);
    });

    it('WHEN only the root is open THEN the src card counts four files', () => {
      expect(sceneOf(MODULES_FOUND_STUB, [], NO_TESTS).leaves[0]).toMatchObject({ id: 'dir:src', fileCount: 4 });
    });

    it('WHEN only the root is open THEN the files it includes are every file but a.spec.ts, folded ones too', () => {
      expect(sceneOf(MODULES_FOUND_STUB, [], NO_TESTS).fileIds).toStrictEqual([
        'file:index.ts',
        'file:src/a.ts',
        'file:src/lib/b.ts',
        'file:src/lib/c.ts',
        'file:src/ui/d.ts'
      ]);
    });
  });

  describe('GIVEN a folder that holds only test files', () => {
    const data: ModulesFound = {
      ...MODULES_FOUND_STUB,
      files: ['src/a.ts', 'test/a.ts'],
      tests: [1],
      stubs: [],
      fileLinks: [],
      stubLinks: []
    };

    it.each<[string, string[]]>([
      ['collapsed', []],
      ['expanded', ['test']]
    ])('WHEN tests are hidden and test is %s THEN the folder is dropped', (_state, expanded) => {
      const scene = sceneOf(data, expanded, NO_TESTS);

      expect(boxIdsOf(scene)).toStrictEqual(['dir:']);
      expect(idsOf(scene)).toStrictEqual(['dir:src']);
    });
  });

  describe('GIVEN a package whose only file is a test', () => {
    it('WHEN tests are hidden THEN the scene is empty, root box included', () => {
      const data: ModulesFound = { ...MODULES_FOUND_STUB, files: ['a.spec.ts'], tests: [0], stubs: [], fileLinks: [], stubLinks: [] };

      expect(sceneOf(data, [], NO_TESTS)).toStrictEqual({ boxes: [], leaves: [], links: [], leafCount: 0, fileIds: [] });
    });
  });
});
