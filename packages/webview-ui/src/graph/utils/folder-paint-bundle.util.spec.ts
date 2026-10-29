import { describe, expect, it } from 'vitest';

import { collapsedIdOf } from './folder-id.util.ts';
import { paintOf } from './paint.util.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { Paint } from '../common/paint.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS, boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { bundle } from '../test/utils/inspections.spec.util.ts';

const LETTERS = new Map<ProbeState, string>([
  ['normal', 'n'],
  ['selected', 's'],
  ['highlighted', 'h'],
  ['dimmed', 'd']
]);

const FOLDERS = ['apps', 'packages'];

const PACKAGES = collapsedIdOf('packages');

const APPS = collapsedIdOf('apps');

type Letters = {
  readonly nodes: string;
  readonly links: string;
  readonly boxes: string;
  readonly collapsedNodes: string;
  readonly folderLinks: string;
};

type BundleCase = {
  readonly title: string;
  readonly inspection: Inspection;
  readonly scene: FolderScene;
  readonly expected: Letters;
};

type NoLinkCase = {
  readonly title: string;
  readonly inspection: Inspection;
  readonly scene: FolderScene | null;
};

const lettersOf = (states: ProbeState[]): string => {
  const letters = states.map((state: ProbeState): string => LETTERS.get(state) ?? '?');

  return letters.join('');
};

const lettersAt = (paint: Paint, links: FolderLink[]): Letters => {
  const nodes = lettersOf(BOARDS_INFOS.map((info): ProbeState => paint.nodeState(info.name)));
  const edges = lettersOf(BOARDS_EDGES.map((edge): ProbeState => paint.edgeState(edge)));
  const boxes = lettersOf(FOLDERS.map((folder): ProbeState => paint.boxState(folder)));
  const collapsedNodes = lettersOf(FOLDERS.map((folder): ProbeState => paint.collapsedState(folder)));
  const folderLinks = lettersOf(links.map((folderLink): ProbeState => paint.folderLinkState(folderLink)));
  const letters: Letters = { nodes, links: edges, boxes, collapsedNodes, folderLinks };

  return letters;
};

const lettersExpected = (nodes: string, links: string, folderLinks: string): Letters => {
  const letters: Letters = { nodes, links, boxes: 'nn', collapsedNodes: 'hh', folderLinks };

  return letters;
};

const CASES: BundleCase[] = [
  {
    title: 'docs to the collapsed packages',
    inspection: bundle('docs', PACKAGES),
    scene: boardsSceneOf(['packages']),
    expected: lettersExpected('hddhh', 'dssd', 'ds')
  },
  {
    title: 'web to the collapsed packages',
    inspection: bundle('web', PACKAGES),
    scene: boardsSceneOf(['packages']),
    expected: lettersExpected('dhdhd', 'sddd', 'sd')
  },
  {
    title: 'the collapsed apps to the collapsed packages',
    inspection: bundle(APPS, PACKAGES),
    scene: boardsSceneOf(FOLDERS),
    expected: lettersExpected('hhdhh', 'sssd', 's')
  }
];

const NO_LINK_CASES: NoLinkCase[] = [
  { title: 'its folder link is gone', inspection: bundle('docs', PACKAGES), scene: boardsSceneOf([]) },
  { title: 'its ends are reversed', inspection: bundle(PACKAGES, 'docs'), scene: boardsSceneOf(['packages']) },
  { title: 'the scene is null', inspection: bundle('docs', PACKAGES), scene: null }
];

describe('FEATURE: paintOf for an inspected bundle', () => {
  describe('GIVEN a bundle inspection over a folder scene', () => {
    it.each(CASES)('WHEN it is $title THEN every state is exact', (row) => {
      const paint = paintOf(row.inspection, BOARDS_EDGES, null, new Set<string>(), row.scene);

      const letters = lettersAt(paint, row.scene.links);

      expect(letters).toStrictEqual(row.expected);
    });
  });

  describe('GIVEN a bundle whose folder link is not in the scene', () => {
    it.each(NO_LINK_CASES)('WHEN $title THEN it paints like none', (row) => {
      const links = row.scene?.links ?? [];
      const none = paintOf(NO_INSPECTION, BOARDS_EDGES, null, new Set<string>(), row.scene);

      const paint = paintOf(row.inspection, BOARDS_EDGES, null, new Set<string>(), row.scene);

      expect(lettersAt(paint, links)).toStrictEqual(lettersAt(none, links));
    });
  });
});
