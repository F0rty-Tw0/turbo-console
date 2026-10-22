import { describe, expect, it } from 'vitest';

import { paintOf } from './paint.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import type { Paint } from '../common/paint.type.ts';
import type { SceneParts } from '../test/common/folder-boards.type.ts';
import { BOARDS_EDGES, BOARDS_INFOS, THREE, THREE_EDGES, sceneOf } from '../test/utils/folder-boards.spec.util.ts';
import { folderInspection } from '../test/utils/inspections.spec.util.ts';

const LETTERS = new Map<ProbeState, string>([
  ['normal', 'n'],
  ['selected', 's'],
  ['highlighted', 'h'],
  ['dimmed', 'd']
]);

const lettersOf = (states: ProbeState[]): string => {
  const letters = states.map((state: ProbeState): string => LETTERS.get(state) ?? '?');

  return letters.join('');
};

type Letters = {
  readonly nodes: string;
  readonly links: string;
  readonly boxes: string;
  readonly collapsedNodes: string;
  readonly folderLinks: string;
};

const WEB_UI_EDGE: GraphEdge = { source: 'web', target: '@acme/ui' };

const FOLDERS = ['apps', 'packages'];

const ROOT_INFOS: GraphPackage[] = [
  { name: 'root-a', path: 'root-a', tags: [], taskCount: 0 },
  { name: 'apps-x', path: 'apps/x', tags: [], taskCount: 0 }
];

const ROOT_EDGES: GraphEdge[] = [{ source: 'apps-x', target: 'root-a' }];

type PaintCase = {
  readonly title: string;
  readonly folder: string;
  readonly infos: GraphPackage[];
  readonly edges: GraphEdge[];
  readonly scene: FolderScene;
  /** One letter per package of `infos`. */
  readonly nodes: string;
  /** One letter per edge of `edges`. */
  readonly links: string;
  /** One letter per folder of `folders`. */
  readonly folders: string[];
  readonly boxes: string;
  readonly collapsedNodes: string;
  /** One letter per folder link of the scene. */
  readonly folderLinks: string;
};

const boardsCase = (
  parts: Pick<PaintCase, 'title' | 'folder' | 'scene' | 'nodes' | 'links' | 'boxes' | 'collapsedNodes' | 'folderLinks'>
): PaintCase => {
  const row: PaintCase = { infos: BOARDS_INFOS, edges: BOARDS_EDGES, folders: FOLDERS, ...parts };

  return row;
};

const BOARDS = (parts: SceneParts): FolderScene => sceneOf(BOARDS_INFOS, BOARDS_EDGES, parts);

const CASES: PaintCase[] = [
  boardsCase({
    title: 'apps with every folder expanded',
    folder: 'apps',
    scene: BOARDS({}),
    nodes: 'nndnn',
    links: 'hhhd',
    boxes: 'sn',
    collapsedNodes: 'sn',
    folderLinks: ''
  }),
  boardsCase({
    title: 'packages with every folder expanded',
    folder: 'packages',
    scene: BOARDS({}),
    nodes: 'nnnnn',
    links: 'hhhn',
    boxes: 'ns',
    collapsedNodes: 'ns',
    folderLinks: ''
  }),
  boardsCase({
    title: 'apps with both folders collapsed',
    folder: 'apps',
    scene: BOARDS({ collapsed: FOLDERS }),
    nodes: 'nndnn',
    links: 'hhhd',
    boxes: 'sn',
    collapsedNodes: 'sn',
    folderLinks: 'h'
  }),
  boardsCase({
    title: 'apps expanded and packages collapsed',
    folder: 'apps',
    scene: BOARDS({ collapsed: ['packages'] }),
    nodes: 'nndnn',
    links: 'hhhd',
    boxes: 'sn',
    collapsedNodes: 'sn',
    folderLinks: 'hh'
  }),
  {
    title: 'f1 with f2 and f3 collapsed',
    folder: 'f1',
    infos: THREE,
    edges: THREE_EDGES,
    scene: sceneOf(THREE, THREE_EDGES, { collapsed: ['f2', 'f3'] }),
    nodes: 'nnnd',
    links: 'hhd',
    folders: ['f1', 'f2', 'f3'],
    boxes: 'snd',
    collapsedNodes: 'snd',
    folderLinks: 'hhd'
  },
  boardsCase({
    title: 'a hidden package is ignored',
    folder: 'apps',
    scene: BOARDS({ visible: ['docs', 'web', '@acme/utils'] }),
    nodes: 'nndnn',
    links: 'hhhd',
    boxes: 'sn',
    collapsedNodes: 'sn',
    folderLinks: ''
  }),
  boardsCase({
    title: 'only a dimmed package is visible in packages',
    folder: 'apps',
    scene: BOARDS({ visible: ['docs', 'web', '@acme/config'] }),
    nodes: 'nndnn',
    links: 'hhhd',
    boxes: 'sd',
    collapsedNodes: 'sd',
    folderLinks: ''
  }),
  boardsCase({
    title: 'a ghost counts in packages',
    folder: 'apps',
    scene: BOARDS({ visible: ['docs', 'web', '@acme/config'], ghosts: ['@acme/utils'] }),
    nodes: 'nndnn',
    links: 'hhhd',
    boxes: 'sn',
    collapsedNodes: 'sn',
    folderLinks: ''
  }),
  {
    title: 'the root folder',
    folder: '',
    infos: ROOT_INFOS,
    edges: ROOT_EDGES,
    scene: sceneOf(ROOT_INFOS, ROOT_EDGES, {}),
    nodes: 'nn',
    links: 'h',
    folders: ['', 'apps'],
    boxes: 'sn',
    collapsedNodes: 'sn',
    folderLinks: ''
  }
];

const lettersAt = (paint: Paint, row: PaintCase): Letters => {
  const nodes = lettersOf(row.infos.map((info): ProbeState => paint.nodeState(info.name)));
  const links = lettersOf(row.edges.map((edge): ProbeState => paint.edgeState(edge)));
  const boxes = lettersOf(row.folders.map((folder): ProbeState => paint.boxState(folder)));
  const collapsedNodes = lettersOf(row.folders.map((folder): ProbeState => paint.collapsedState(folder)));
  const folderLinks = lettersOf(row.scene.links.map((link): ProbeState => paint.folderLinkState(link)));

  const letters: Letters = { nodes, links, boxes, collapsedNodes, folderLinks };

  return letters;
};

describe('FEATURE: paintOf for an inspected folder', () => {
  describe('GIVEN a folder inspection over a folder scene', () => {
    it.each(CASES)('WHEN it is $title THEN every state is exact', (row) => {
      const inspection = folderInspection(row.folder);
      const { nodes, links, boxes, collapsedNodes, folderLinks } = row;
      const expected: Letters = { nodes, links, boxes, collapsedNodes, folderLinks };

      const paint = paintOf(inspection, row.edges, null, new Set<string>(), row.scene);

      expect(lettersAt(paint, row)).toStrictEqual(expected);
    });
  });

  describe('GIVEN an id the scene does not know', () => {
    it('WHEN the box and collapsed states of nope are read THEN both are normal', () => {
      const inspection = folderInspection('apps');
      const scene = sceneOf(BOARDS_INFOS, BOARDS_EDGES, {});

      const paint = paintOf(inspection, BOARDS_EDGES, null, new Set<string>(), scene);

      expect([paint.boxState('nope'), paint.collapsedState('nope')]).toStrictEqual(['normal', 'normal']);
    });
  });

  describe('GIVEN no scene', () => {
    it('WHEN a folder is inspected THEN every state is normal', () => {
      const inspection = folderInspection('apps');

      const paint = paintOf(inspection, BOARDS_EDGES, null, new Set<string>(), null);

      expect([paint.nodeState('web'), paint.edgeState(WEB_UI_EDGE), paint.boxState('apps')]).toStrictEqual([
        'normal',
        'normal',
        'normal'
      ]);
    });
  });
});
