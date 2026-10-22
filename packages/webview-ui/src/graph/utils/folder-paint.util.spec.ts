import { describe, expect, it } from 'vitest';

import { collapsedIdOf } from './folder-id.util.ts';
import { strongestOf } from './folder-paint.util.ts';
import { folderSceneOf } from './folder-scene.util.ts';
import { paintOf } from './paint.util.ts';
import type { GraphEdge, GraphPackage } from '../../bridge/common/graph-state.type.ts';
import type { FolderLink, FolderScene } from '../common/folder-scene.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { Paint } from '../common/paint.type.ts';
import type { TraceResult } from '../common/trace.type.ts';
import { boardsSceneOf } from '../test/utils/folder-boards.spec.util.ts';

const UI = '@acme/ui';
const UTILS = '@acme/utils';
const CONFIG = '@acme/config';

const edgeOf = (source: string, target: string): GraphEdge => {
  const edge: GraphEdge = { source, target };

  return edge;
};

const STATES: Record<string, ProbeState> = { n: 'normal', s: 'selected', h: 'highlighted', d: 'dimmed' };

const statesIn = (letters: string): ProbeState[] => {
  const letterList = [...letters];

  return letterList.map((letter: string): ProbeState => STATES[letter] ?? 'normal');
};

type FolderCase = {
  readonly title: string;
  readonly inspection: Inspection;
  readonly trace: TraceResult | null;
  readonly lit: string[];
  readonly collapsed: string[];
  /** Box states of `apps` then `packages`, one letter each. */
  readonly boxes: string;
  /** One letter per collapsed folder, in `collapsed` order. */
  readonly collapsedNodes: string;
  /** One letter per folder link: `apps` to `@acme/ui`, then `apps` to `@acme/utils`. */
  readonly links: string;
};

type FolderRows = { readonly boxes: ProbeState[]; readonly collapsedNodes: ProbeState[]; readonly links: ProbeState[] };

const FOLDER_UI_UTILS: TraceResult = { direction: 'forward', path: [UI, UTILS], edges: [edgeOf(UI, UTILS)] };

const FOLDER_PACKAGE_UI: Inspection = { kind: 'package', name: UI };

const FOLDER_PACKAGE_CONFIG: Inspection = { kind: 'package', name: CONFIG };

const FOLDER_LINK_UI_UTILS: Inspection = { kind: 'link', source: UI, target: UTILS };

const FOLDER_LINK_DOCS_UTILS: Inspection = { kind: 'link', source: 'docs', target: UTILS };

const FOLDER_LINK_WEB_UI: Inspection = { kind: 'link', source: 'web', target: UI };

const FOLDER_PICKING_CONFIG: Inspection = { kind: 'picking', start: CONFIG, isNudged: false };

const FOLDER_PICKING_WEB: Inspection = { kind: 'picking', start: 'web', isNudged: false };

const FOLDER_TRACE_UI_UTILS: Inspection = { kind: 'trace', start: UI, end: UTILS };

const FOLDER_CASES: FolderCase[] = [
  {
    title: 'none',
    inspection: NO_INSPECTION,
    trace: null,
    lit: [],
    collapsed: ['apps'],
    boxes: 'nn',
    collapsedNodes: 'n',
    links: 'nn'
  },
  {
    title: 'package ui',
    inspection: FOLDER_PACKAGE_UI,
    trace: null,
    lit: [],
    collapsed: ['apps'],
    boxes: 'nn',
    collapsedNodes: 'h',
    links: 'hh'
  },
  {
    title: 'package config',
    inspection: FOLDER_PACKAGE_CONFIG,
    trace: null,
    lit: [],
    collapsed: ['apps'],
    boxes: 'dn',
    collapsedNodes: 'd',
    links: 'dd'
  },
  {
    title: 'link ui to utils',
    inspection: FOLDER_LINK_UI_UTILS,
    trace: null,
    lit: [],
    collapsed: ['apps'],
    boxes: 'dn',
    collapsedNodes: 'd',
    links: 'dd'
  },
  {
    title: 'link docs to utils',
    inspection: FOLDER_LINK_DOCS_UTILS,
    trace: null,
    lit: [],
    collapsed: ['apps'],
    boxes: 'nn',
    collapsedNodes: 'h',
    links: 'dh'
  },
  {
    title: 'link web to ui, nothing collapsed',
    inspection: FOLDER_LINK_WEB_UI,
    trace: null,
    lit: [],
    collapsed: [],
    boxes: 'nn',
    collapsedNodes: '',
    links: ''
  },
  {
    title: 'picking config, lit empty',
    inspection: FOLDER_PICKING_CONFIG,
    trace: null,
    lit: [],
    collapsed: ['apps'],
    boxes: 'dn',
    collapsedNodes: 'd',
    links: 'dd'
  },
  {
    title: 'picking web, ui and utils lit',
    inspection: FOLDER_PICKING_WEB,
    trace: null,
    lit: [UI, UTILS],
    collapsed: ['apps'],
    boxes: 'nn',
    collapsedNodes: 's',
    links: 'nn'
  },
  {
    title: 'trace ui to utils',
    inspection: FOLDER_TRACE_UI_UTILS,
    trace: FOLDER_UI_UTILS,
    lit: [],
    collapsed: ['apps'],
    boxes: 'dn',
    collapsedNodes: 'd',
    links: 'dd'
  }
];

const folderRowsOf = (paint: Paint, scene: FolderScene): FolderRows => {
  const boxFolders = ['apps', 'packages'];
  const collapsedFolders = [...scene.collapsed];
  const boxes = boxFolders.map((folder: string): ProbeState => paint.boxState(folder));
  const collapsedNodes = collapsedFolders.map((folder: string): ProbeState => paint.collapsedState(folder));
  const links = scene.links.map((link: FolderLink): ProbeState => paint.folderLinkState(link));
  const rows: FolderRows = { boxes, collapsedNodes, links };

  return rows;
};

const expectedFolderRowsOf = (row: FolderCase): FolderRows => {
  const rows: FolderRows = { boxes: statesIn(row.boxes), collapsedNodes: statesIn(row.collapsedNodes), links: statesIn(row.links) };

  return rows;
};

type OrderCase = { readonly states: ProbeState[]; readonly strongest: ProbeState };

const FOLDER_WEB_UTILS: TraceResult = {
  direction: 'forward',
  path: ['web', UI, UTILS],
  edges: [edgeOf('web', UI), edgeOf(UI, UTILS)]
};

const packageOf = (name: string, path: string): GraphPackage => {
  const pkg: GraphPackage = { name, path, tags: [], taskCount: 0 };

  return pkg;
};

const UNKNOWN_LINK: FolderLink = { source: collapsedIdOf('nope'), target: 'zzz', links: [] };

const ORDER_CASES: OrderCase[] = [
  { states: ['dimmed', 'normal', 'highlighted', 'selected'], strongest: 'selected' },
  { states: ['dimmed', 'normal', 'highlighted'], strongest: 'highlighted' },
  { states: ['dimmed', 'normal'], strongest: 'normal' },
  { states: ['dimmed'], strongest: 'dimmed' },
  { states: [], strongest: 'normal' }
];

describe('FEATURE: folder paint', () => {
  describe('GIVEN a list of package states', () => {
    it.each(ORDER_CASES)('WHEN the states are $states THEN the strongest is $strongest', (row: OrderCase) => {
      const strongest = strongestOf(row.states);

      expect(strongest).toBe(row.strongest);
    });
  });

  describe('GIVEN the boards folders', () => {
    it.each(FOLDER_CASES)(
      'WHEN the inspection is $title THEN each box, collapsed node and folder link gets its state',
      (row: FolderCase) => {
        const scene = boardsSceneOf(row.collapsed);
        const paint = paintOf(row.inspection, scene.edges, row.trace, new Set(row.lit), scene);

        const rows = folderRowsOf(paint, scene);

        expect(rows).toStrictEqual(expectedFolderRowsOf(row));
      }
    );

    it('WHEN the only visible packages sit outside a folder THEN its box is normal and its collapsed node is normal', () => {
      const scene = boardsSceneOf(['apps'], [CONFIG, UI]);
      const inspection: Inspection = { kind: 'package', name: CONFIG };

      const paint = paintOf(inspection, scene.edges, null, new Set(), scene);

      expect(paint.boxState('apps')).toBe('normal');
      expect(paint.collapsedState('apps')).toBe('normal');
    });

    it('WHEN the trace path packages are ghosts THEN they count toward the folder', () => {
      const scene = boardsSceneOf(['packages'], ['web', 'docs', CONFIG], [UI, UTILS]);
      const inspection: Inspection = { kind: 'trace', start: 'web', end: UTILS };

      const paint = paintOf(inspection, scene.edges, FOLDER_WEB_UTILS, new Set(), scene);

      expect(paint.collapsedState('packages')).toBe('selected');
      expect(paint.boxState('packages')).toBe('normal');
    });

    it('WHEN the same scene has no ghosts THEN only the visible package counts', () => {
      const scene = boardsSceneOf(['packages'], ['web', 'docs', CONFIG]);
      const inspection: Inspection = { kind: 'trace', start: 'web', end: UTILS };

      const paint = paintOf(inspection, scene.edges, FOLDER_WEB_UTILS, new Set(), scene);

      expect(paint.collapsedState('packages')).toBe('dimmed');
      expect(paint.boxState('packages')).toBe('dimmed');
    });

    it('WHEN a folder, a folder id or an end is unknown THEN it is normal', () => {
      const scene = boardsSceneOf(['apps']);
      const inspection: Inspection = { kind: 'package', name: UI };

      const paint = paintOf(inspection, scene.edges, null, new Set(), scene);

      expect(paint.boxState('nope')).toBe('normal');
      expect(paint.collapsedState('nope')).toBe('normal');
      expect(paint.folderLinkState(UNKNOWN_LINK)).toBe('normal');
    });

    it('WHEN the scene is null THEN every folder state is normal', () => {
      const scene = boardsSceneOf(['apps']);
      const inspection: Inspection = { kind: 'package', name: UI };
      const link = scene.links[0] ?? UNKNOWN_LINK;

      const paint = paintOf(inspection, scene.edges, null, new Set(), null);

      expect(paint.boxState('apps')).toBe('normal');
      expect(paint.collapsedState('apps')).toBe('normal');
      expect(paint.folderLinkState(link)).toBe('normal');
    });
  });

  describe('GIVEN a folder named __proto__ holding a package named constructor', () => {
    it('WHEN that package is selected THEN its box is normal and its collapsed node selected', () => {
      const infos: GraphPackage[] = [packageOf('constructor', '__proto__/constructor')];
      const scene = folderSceneOf(infos, [], new Set(['__proto__']), new Set(['constructor']), new Set());
      const inspection: Inspection = { kind: 'package', name: 'constructor' };

      const paint = paintOf(inspection, [], null, new Set(), scene);

      expect(paint.boxState('__proto__')).toBe('normal');
      expect(paint.collapsedState('__proto__')).toBe('selected');
    });
  });
});
