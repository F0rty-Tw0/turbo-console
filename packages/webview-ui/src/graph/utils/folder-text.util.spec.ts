import { describe, expect, it } from 'vitest';

import { folderTitleOf } from './controls-text.util.ts';
import { collapsedIdOf } from './folder-id.util.ts';
import {
  bundleEndTextOf,
  bundleSummaryOf,
  folderCountsOf,
  folderPackagesTitleOf,
  folderStatusText,
  folderSummaryOf
} from './folder-text.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { FolderCounts } from '../common/details.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS, boardsSceneOf, sceneOf } from '../test/utils/folder-boards.spec.util.ts';

type CountsRow = {
  readonly title: string;
  readonly scene: FolderScene;
  readonly folder: string;
  readonly expected: FolderCounts;
};

type StatusRow = {
  readonly title: string;
  readonly scene: FolderScene;
  readonly folder: string;
  readonly expected: string;
};

type SummaryRow = {
  readonly counts: FolderCounts;
  readonly expected: string;
};

type EndRow = {
  readonly title: string;
  readonly id: string;
  readonly expected: string;
};

type BundleRow = {
  readonly title: string;
  readonly scene: FolderScene;
  readonly expected: string[];
};

const infoOf = (name: string, path: string): GraphPackage => {
  const info: GraphPackage = { name, path, tags: [], taskCount: 0 };

  return info;
};

const countsOf = (packages: number, inside: number, linksIn: number, linksOut: number): FolderCounts => {
  const counts: FolderCounts = { packages, inside, linksIn, linksOut };

  return counts;
};

const ALL = sceneOf(BOARDS_INFOS, BOARDS_EDGES, {});

const NO_UI = sceneOf(BOARDS_INFOS, BOARDS_EDGES, { visible: ['docs', 'web', '@acme/config', '@acme/utils'] });

const BOTH_COLLAPSED = sceneOf(BOARDS_INFOS, BOARDS_EDGES, { collapsed: ['apps', 'packages'] });

const REPEATED_EDGES: GraphEdge[] = [
  ...BOARDS_EDGES,
  { source: 'web', target: '@acme/ui' },
  { source: '@acme/ui', target: '@acme/utils' }
];

const REPEATED = sceneOf(BOARDS_INFOS, REPEATED_EDGES, {});

const PROTO = sceneOf([infoOf('a', '__proto__/a'), infoOf('b', 'x/b')], [{ source: 'b', target: 'a' }], {});

const ROOTS = sceneOf([infoOf('r', 'r'), infoOf('p', '(root)/p')], [{ source: 'p', target: 'r' }], {});

const EACH_WAY_EDGES: GraphEdge[] = [
  { source: 's', target: 'm' },
  { source: 'm', target: 't' }
];

const EACH_WAY = sceneOf([infoOf('m', 'x/m'), infoOf('s', 'a/s'), infoOf('t', 'b/t')], EACH_WAY_EDGES, {});

const SOLO = sceneOf([infoOf('s', 'solo/s'), infoOf('o', 'other/o')], [], {});

describe('FEATURE: folder text', () => {
  describe('GIVEN a folder scene', () => {
    it.each([
      { title: 'apps with every package visible', scene: ALL, folder: 'apps', expected: countsOf(2, 0, 0, 3) },
      { title: 'packages with every package visible', scene: ALL, folder: 'packages', expected: countsOf(3, 1, 3, 0) },
      { title: 'apps with @acme/ui hidden', scene: NO_UI, folder: 'apps', expected: countsOf(2, 0, 0, 1) },
      { title: 'packages with @acme/ui hidden', scene: NO_UI, folder: 'packages', expected: countsOf(3, 1, 1, 0) },
      { title: 'apps with both folders collapsed', scene: BOTH_COLLAPSED, folder: 'apps', expected: countsOf(2, 0, 0, 3) },
      { title: 'an unknown folder', scene: ALL, folder: 'zzz', expected: countsOf(0, 0, 0, 0) },
      { title: 'apps with a link repeated', scene: REPEATED, folder: 'apps', expected: countsOf(2, 0, 0, 3) },
      { title: 'packages with links repeated', scene: REPEATED, folder: 'packages', expected: countsOf(3, 1, 3, 0) },
      { title: 'a folder named __proto__', scene: PROTO, folder: '__proto__', expected: countsOf(1, 0, 1, 0) },
      { title: 'the root folder beside a real (root)', scene: ROOTS, folder: '', expected: countsOf(1, 0, 1, 0) },
      { title: 'a real (root) beside the root folder', scene: ROOTS, folder: '(root)', expected: countsOf(1, 0, 0, 1) }
    ] satisfies CountsRow[])('WHEN the counts of $title are taken THEN they are exact', ({ scene, folder, expected }) => {
      const counts = folderCountsOf(scene, folder);

      expect(counts).toStrictEqual(expected);
    });

    it.each([
      { title: 'apps', scene: ALL, folder: 'apps', expected: 'Folder apps: 2 packages, 3 links out' },
      { title: 'packages', scene: ALL, folder: 'packages', expected: 'Folder packages: 3 packages, 3 links in' },
      { title: 'x', scene: EACH_WAY, folder: 'x', expected: 'Folder x: 1 package, 1 link in, 1 link out' },
      { title: 'solo', scene: SOLO, folder: 'solo', expected: 'Folder solo: 1 package' },
      { title: folderTitleOf(''), scene: ROOTS, folder: '', expected: 'Folder (root): 1 package, 1 link in' },
      { title: folderTitleOf('(root)'), scene: ROOTS, folder: '(root)', expected: 'Folder ./(root): 1 package, 1 link out' }
    ] satisfies StatusRow[])('WHEN the status of $title is built THEN it is exact', ({ title, scene, folder, expected }) => {
      const text = folderStatusText(title, scene, folder);

      expect(text).toBe(expected);
    });
  });

  describe('GIVEN folder counts', () => {
    it.each([
      { counts: countsOf(2, 0, 0, 3), expected: '2 packages · 0 links inside' },
      { counts: countsOf(1, 1, 0, 0), expected: '1 package · 1 link inside' },
      { counts: countsOf(3, 1, 3, 0), expected: '3 packages · 1 link inside' },
      { counts: countsOf(3, 2, 0, 0), expected: '3 packages · 2 links inside' }
    ] satisfies SummaryRow[])('WHEN the summary is built THEN it reads $expected', ({ counts, expected }) => {
      const summary = folderSummaryOf(counts);

      expect(summary).toBe(expected);
    });

    it('WHEN the packages title of 3 is built THEN it reads Packages (3)', () => {
      const title = folderPackagesTitleOf(3);

      expect(title).toBe('Packages (3)');
    });
  });

  describe('FEATURE: bundleEndTextOf', () => {
    it.each([
      { title: 'a package', id: 'docs', expected: 'docs' },
      { title: 'a collapsed folder', id: collapsedIdOf('packages'), expected: 'packages' },
      { title: 'the collapsed root folder', id: collapsedIdOf(''), expected: '(root)' }
    ] satisfies EndRow[])('WHEN the end text of $title is built THEN it reads $expected', ({ id, expected }) => {
      const text = bundleEndTextOf(id);

      expect(text).toBe(expected);
    });
  });

  describe('FEATURE: bundleSummaryOf', () => {
    it.each([
      {
        title: 'packages collapsed',
        scene: boardsSceneOf(['packages']),
        expected: ['1 link: web → packages', '2 links: docs → packages']
      },
      {
        title: 'apps collapsed',
        scene: boardsSceneOf(['apps']),
        expected: ['2 links: apps → @acme/ui', '1 link: apps → @acme/utils']
      },
      { title: 'both collapsed', scene: boardsSceneOf(['apps', 'packages']), expected: ['3 links: apps → packages'] }
    ] satisfies BundleRow[])('WHEN the summaries of $title are built THEN they read $expected', ({ scene, expected }) => {
      const summaries = scene.links.map(bundleSummaryOf);

      expect(summaries).toStrictEqual(expected);
    });
  });
});
