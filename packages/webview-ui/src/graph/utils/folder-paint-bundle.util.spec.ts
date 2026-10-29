import { describe, expect, it } from 'vitest';

import { collapsedIdOf } from './folder-id.util.ts';
import { paintOf } from './paint.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { Paint } from '../common/paint.type.ts';
import type { Letters } from '../test/common/paint-letters.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS, boardsSceneOf, sceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { bundle } from '../test/utils/inspections.spec.util.ts';
import { lettersOf } from '../test/utils/paint-letters.spec.util.ts';

const FOLDERS = ['apps', 'packages'];

const PACKAGES = collapsedIdOf('packages');

const APPS = collapsedIdOf('apps');

type BundleCase = {
  readonly title: string;
  readonly inspection: Inspection;
  readonly edges: GraphEdge[];
  readonly buildScene: () => FolderScene;
  readonly expected: Letters;
};

type NoLinkCase = {
  readonly title: string;
  readonly inspection: Inspection;
  readonly buildScene: () => FolderScene | null;
};

const PACKAGES_TO_APPS: GraphEdge = { source: '@acme/ui', target: 'docs' };

const REVERSE_EDGES: GraphEdge[] = [...BOARDS_EDGES, PACKAGES_TO_APPS];

const reverseSceneOf = (): FolderScene => sceneOf(BOARDS_INFOS, REVERSE_EDGES, { collapsed: FOLDERS });

const lettersAt = (paint: Paint, edges: GraphEdge[], links: FolderLink[]): Letters => {
  const nodes = lettersOf(BOARDS_INFOS.map((info): ProbeState => paint.nodeState(info.name)));
  const edgeLetters = lettersOf(edges.map((edge): ProbeState => paint.edgeState(edge)));
  const boxes = lettersOf(FOLDERS.map((folder): ProbeState => paint.boxState(folder)));
  const collapsedNodes = lettersOf(FOLDERS.map((folder): ProbeState => paint.collapsedState(folder)));
  const folderLinks = lettersOf(links.map((folderLink): ProbeState => paint.folderLinkState(folderLink)));
  const letters: Letters = { nodes, links: edgeLetters, boxes, collapsedNodes, folderLinks };

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
    edges: BOARDS_EDGES,
    buildScene: () => boardsSceneOf(['packages']),
    expected: lettersExpected('hddhh', 'dssd', 'ds')
  },
  {
    title: 'web to the collapsed packages',
    inspection: bundle('web', PACKAGES),
    edges: BOARDS_EDGES,
    buildScene: () => boardsSceneOf(['packages']),
    expected: lettersExpected('dhdhd', 'sddd', 'sd')
  },
  {
    title: 'the collapsed apps to the collapsed packages',
    inspection: bundle(APPS, PACKAGES),
    edges: BOARDS_EDGES,
    buildScene: () => boardsSceneOf(FOLDERS),
    expected: lettersExpected('hhdhh', 'sssd', 's')
  },
  {
    title: 'the collapsed apps to the collapsed packages and a link runs back',
    inspection: bundle(APPS, PACKAGES),
    edges: REVERSE_EDGES,
    buildScene: reverseSceneOf,
    expected: lettersExpected('hhdhh', 'sssdd', 'sd')
  }
];

const NO_LINK_CASES: NoLinkCase[] = [
  { title: 'its folder link is gone', inspection: bundle('docs', PACKAGES), buildScene: () => boardsSceneOf([]) },
  { title: 'its ends are reversed', inspection: bundle(PACKAGES, 'docs'), buildScene: () => boardsSceneOf(['packages']) },
  { title: 'the scene is null', inspection: bundle('docs', PACKAGES), buildScene: () => null }
];

describe('FEATURE: paintOf for an inspected bundle', () => {
  describe('GIVEN a bundle inspection over a folder scene', () => {
    it.each(CASES)('WHEN it is $title THEN every state is exact', (row) => {
      const paint = paintOf(row.inspection, row.edges, null, new Set<string>(), row.buildScene());

      const letters = lettersAt(paint, row.edges, row.buildScene().links);

      expect(letters).toStrictEqual(row.expected);
    });
  });

  describe('GIVEN a bundle whose folder link is not in the scene', () => {
    it.each(NO_LINK_CASES)('WHEN $title THEN it paints like none', (row) => {
      const scene = row.buildScene();
      const links = scene?.links ?? [];
      const none = paintOf(NO_INSPECTION, BOARDS_EDGES, null, new Set<string>(), scene);
      const paint = paintOf(row.inspection, BOARDS_EDGES, null, new Set<string>(), scene);
      const noneLetters = lettersAt(none, BOARDS_EDGES, links);

      const letters = lettersAt(paint, BOARDS_EDGES, links);

      expect(letters).toStrictEqual(noneLetters);
    });
  });
});
