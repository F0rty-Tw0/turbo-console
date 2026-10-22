import { describe, expect, it } from 'vitest';

import { paintOf } from './paint.util.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { ProbeState } from '../common/graph-probe.type.ts';
import { NO_INSPECTION } from '../common/inspection.const.ts';
import type { Inspection } from '../common/inspection.type.ts';
import type { Paint } from '../common/paint.type.ts';
import type { TraceResult } from '../common/trace.type.ts';

type NodeRow = [string, ProbeState];

type EdgeRow = [GraphEdge, ProbeState];

type PaintRows = { readonly nodes: NodeRow[]; readonly edges: EdgeRow[] };

type PaintCase = {
  readonly title: string;
  readonly inspection: Inspection;
  readonly trace: TraceResult | null;
  readonly lit: string[];
  /** One letter per package in `NAMES` order: n normal, s selected, h highlighted, d dimmed. */
  readonly nodes: string;
  /** One letter per link in `SHOP` order. */
  readonly edges: string;
};

const edgeOf = (source: string, target: string): GraphEdge => {
  const edge: GraphEdge = { source, target };

  return edge;
};

const WEB_UI = edgeOf('web', 'ui');
const WEB_FORMS = edgeOf('web', 'forms');
const UI_CORE = edgeOf('ui', 'core');
const FORMS_CORE = edgeOf('forms', 'core');

const SHOP: GraphEdge[] = [WEB_UI, WEB_FORMS, UI_CORE, FORMS_CORE];

const NAMES = ['web', 'ui', 'forms', 'core', 'docs'];

const FORWARD: TraceResult = { direction: 'forward', path: ['web', 'forms', 'core'], edges: [WEB_FORMS, FORMS_CORE] };

const BACKWARD: TraceResult = { direction: 'backward', path: ['web', 'forms', 'core'], edges: [WEB_FORMS, FORMS_CORE] };

const NO_PATH: TraceResult = { direction: 'none', path: [], edges: [] };

const DIRECT: TraceResult = { direction: 'forward', path: ['web', 'ui'], edges: [WEB_UI] };

const STATES: Record<string, ProbeState> = { n: 'normal', s: 'selected', h: 'highlighted', d: 'dimmed' };

const statesIn = (letters: string): ProbeState[] => {
  const letterList = [...letters];

  return letterList.map((letter: string): ProbeState => STATES[letter] ?? 'normal');
};

const PACKAGE_UI: Inspection = { kind: 'package', name: 'ui' };

const LINK_WEB_UI: Inspection = { kind: 'link', source: 'web', target: 'ui' };

const PICKING_WEB: Inspection = { kind: 'picking', start: 'web', isNudged: false };

const TRACE_WEB_CORE: Inspection = { kind: 'trace', start: 'web', end: 'core' };

const TRACE_CORE_WEB: Inspection = { kind: 'trace', start: 'core', end: 'web' };

const TRACE_WEB_UI: Inspection = { kind: 'trace', start: 'web', end: 'ui' };

const CASES: PaintCase[] = [
  { title: 'none', inspection: NO_INSPECTION, trace: null, lit: [], nodes: 'nnnnn', edges: 'nnnn' },
  { title: 'package ui', inspection: PACKAGE_UI, trace: null, lit: [], nodes: 'hsdhd', edges: 'hdhd' },
  {
    title: 'package ignores lit',
    inspection: PACKAGE_UI,
    trace: null,
    lit: ['web', 'docs'],
    nodes: 'hsdhd',
    edges: 'hdhd'
  },
  {
    title: 'link web to ui',
    inspection: LINK_WEB_UI,
    trace: null,
    lit: [],
    nodes: 'hhddd',
    edges: 'sddd'
  },
  { title: 'picking, empty lit', inspection: PICKING_WEB, trace: null, lit: [], nodes: 'sdddd', edges: 'dddd' },
  { title: 'picking, some lit', inspection: PICKING_WEB, trace: null, lit: ['ui', 'core'], nodes: 'shdhd', edges: 'dddd' },
  {
    title: 'picking, every path candidate lit',
    inspection: PICKING_WEB,
    trace: null,
    lit: ['ui', 'forms', 'core'],
    nodes: 'shhhd',
    edges: 'dddd'
  },
  {
    title: 'picking, start in lit stays selected',
    inspection: PICKING_WEB,
    trace: null,
    lit: ['web', 'ui'],
    nodes: 'shddd',
    edges: 'dddd'
  },
  {
    title: 'trace forward',
    inspection: TRACE_WEB_CORE,
    trace: FORWARD,
    lit: [],
    nodes: 'sdhsd',
    edges: 'dhdh'
  },
  {
    title: 'trace backward',
    inspection: TRACE_CORE_WEB,
    trace: BACKWARD,
    lit: [],
    nodes: 'sdhsd',
    edges: 'dhdh'
  },
  {
    title: 'trace, no path',
    inspection: TRACE_WEB_CORE,
    trace: NO_PATH,
    lit: [],
    nodes: 'sddsd',
    edges: 'dddd'
  },
  {
    title: 'trace not computed',
    inspection: TRACE_WEB_CORE,
    trace: null,
    lit: [],
    nodes: 'sddsd',
    edges: 'dddd'
  },
  {
    title: 'trace, direct link',
    inspection: TRACE_WEB_UI,
    trace: DIRECT,
    lit: [],
    nodes: 'ssddd',
    edges: 'hddd'
  },
  {
    title: 'trace ignores lit',
    inspection: TRACE_WEB_CORE,
    trace: FORWARD,
    lit: ['docs'],
    nodes: 'sdhsd',
    edges: 'dhdh'
  }
];

const nodeRowOf = (paint: Paint, name: string): NodeRow => [name, paint.nodeState(name)];

const edgeRowOf = (paint: Paint, edge: GraphEdge): EdgeRow => [edge, paint.edgeState(edge)];

const rowsOf = (paint: Paint): PaintRows => {
  const nodes = NAMES.map((name: string): NodeRow => nodeRowOf(paint, name));
  const edges = SHOP.map((edge: GraphEdge): EdgeRow => edgeRowOf(paint, edge));
  const rows: PaintRows = { nodes, edges };

  return rows;
};

const expectedRowsOf = (row: PaintCase): PaintRows => {
  const nodeStates = statesIn(row.nodes);
  const edgeStates = statesIn(row.edges);
  const nodes = NAMES.map((name: string, index: number): NodeRow => [name, nodeStates[index] ?? 'normal']);
  const edges = SHOP.map((edge: GraphEdge, index: number): EdgeRow => [edge, edgeStates[index] ?? 'normal']);
  const rows: PaintRows = { nodes, edges };

  return rows;
};

describe('FEATURE: paintOf', () => {
  describe('GIVEN the shop graph', () => {
    it.each(CASES)('WHEN the inspection is $title THEN each package and link gets its state', (row: PaintCase) => {
      const paint = paintOf(row.inspection, SHOP, row.trace, new Set(row.lit), null);

      const rows = rowsOf(paint);

      expect(rows).toStrictEqual(expectedRowsOf(row));
    });
  });

  describe('GIVEN package names that are Object.prototype members', () => {
    it('WHEN __proto__ is selected THEN it is selected, its neighbour highlighted and a stranger dimmed', () => {
      const edge = edgeOf('__proto__', 'constructor');
      const edges: GraphEdge[] = [edge];
      const inspection: Inspection = { kind: 'package', name: '__proto__' };

      const paint = paintOf(inspection, edges, null, new Set(), null);

      expect(paint.nodeState('__proto__')).toBe('selected');
      expect(paint.nodeState('constructor')).toBe('highlighted');
      expect(paint.nodeState('plain')).toBe('dimmed');
      expect(paint.edgeState(edge)).toBe('highlighted');
    });
  });
});
