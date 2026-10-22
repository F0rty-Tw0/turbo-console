import { describe, expect, it } from 'vitest';

import { folderSceneOf } from './folder-scene.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS, boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';

const packageOf = (name: string, path: string): GraphPackage => {
  const pkg: GraphPackage = { name, path, tags: [], taskCount: 0 };

  return pkg;
};

describe('FEATURE: folderSceneOf', () => {
  describe('GIVEN the boards fixture with apps collapsed', () => {
    it('WHEN the scene is built THEN members lists every package of a folder in graph order', () => {
      const scene = boardsSceneOf(['apps']);

      expect(scene.members.get('apps')).toStrictEqual(['docs', 'web']);
      expect(scene.members.get('packages')).toStrictEqual(['@acme/config', '@acme/ui', '@acme/utils']);
    });

    it('WHEN the scene is built THEN folderOf maps each package to its folder', () => {
      const scene = boardsSceneOf(['apps']);

      expect(scene.folderOf.get('web')).toBe('apps');
      expect(scene.folderOf.get('@acme/utils')).toBe('packages');
    });

    it('WHEN the scene is built THEN edges is all four package links and links the folder links', () => {
      const scene = boardsSceneOf(['apps']);

      expect(scene.edges).toStrictEqual(BOARDS_EDGES);
      expect(scene.links.map((link) => [link.source, link.target])).toStrictEqual([
        ['\u0002apps', '@acme/ui'],
        ['\u0002apps', '@acme/utils']
      ]);
    });
  });

  describe('GIVEN every package visible', () => {
    it('WHEN the scene is built THEN both folders are shown', () => {
      const scene = boardsSceneOf([]);

      expect([...scene.shown]).toStrictEqual(['apps', 'packages']);
    });
  });

  describe('GIVEN only docs and web visible', () => {
    it('WHEN the scene is built THEN only apps is shown', () => {
      const scene = boardsSceneOf([], ['docs', 'web']);

      expect([...scene.shown]).toStrictEqual(['apps']);
    });

    it('WHEN @acme/ui is a ghost THEN packages is shown too', () => {
      const scene = boardsSceneOf([], ['docs', 'web'], ['@acme/ui']);

      expect([...scene.shown]).toStrictEqual(['apps', 'packages']);
      expect([...scene.ghosts]).toStrictEqual(['@acme/ui']);
      expect([...scene.visible]).toStrictEqual(['docs', 'web']);
    });
  });

  describe('GIVEN a collapsed set naming a folder the graph lacks', () => {
    it('WHEN the scene is built THEN collapsed keeps only the folders that exist', () => {
      const scene = boardsSceneOf(['apps', 'gone']);

      expect([...scene.collapsed]).toStrictEqual(['apps']);
    });
  });

  describe('GIVEN packages in the root folder and in a folder named (root)', () => {
    const infos: GraphPackage[] = [packageOf('solo', 'solo'), packageOf('x', '(root)/x')];

    it('WHEN the scene is built THEN members has the two distinct keys', () => {
      const scene = folderSceneOf(infos, [], new Set(), new Set(['solo', 'x']), new Set());

      const folders = scene.members.keys();

      expect([...folders]).toStrictEqual(['', '(root)']);
    });
  });

  describe('GIVEN a package named constructor', () => {
    it('WHEN the scene is built THEN folderOf finds it like any other', () => {
      const extra = packageOf('constructor', 'apps/constructor');
      const infos: GraphPackage[] = [...BOARDS_INFOS, extra];

      const scene = folderSceneOf(infos, [], new Set(), new Set(), new Set());

      expect(scene.folderOf.get('constructor')).toBe('apps');
    });
  });
});
