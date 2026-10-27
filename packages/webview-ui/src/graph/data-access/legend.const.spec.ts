import type { StylesheetJson } from 'cytoscape';
import { describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import { FLOW_EDGE_LIMIT } from '../common/flow.const.ts';
import type { FlowSegment } from '../common/flow.type.ts';
import { LEGEND_ROWS } from '../common/legend.const.ts';
import type { LegendColour, LegendOutline, LegendRow } from '../common/legend.type.ts';
import { flowPenMock } from '../test/mocks/graph-flow-pen.mock.ts';
import { SELECTION_COLORS_STUB, THEME_COLORS_STUB } from '../test/stubs/theme-colors.stub.ts';
import { drawFlow } from '../utils/flow-draw.util.ts';

const COLORS = THEME_COLORS_STUB;

const SHEET: StylesheetJson = graphStyleOf(COLORS, 'sans-serif', false);

const COLOUR_OF: Record<LegendColour, string> = {
  frame: COLORS.frame,
  background: COLORS.background,
  edge: COLORS.edge,
  selected: COLORS.selected,
  highlighted: COLORS.highlighted,
  cached: COLORS.cached,
  selectionFill: SELECTION_COLORS_STUB.fill,
  'run-running': COLORS.runs.running,
  'run-continuous': COLORS.runs.continuous,
  'run-passed': COLORS.runs.passed,
  'run-failed': COLORS.runs.failed,
  'run-stopped': COLORS.runs.stopped,
  'run-failed-to-start': COLORS.runs['failed-to-start']
};

const PACKAGE_IDS = [
  'package',
  'selected',
  'focus-target',
  'highlighted',
  'dimmed',
  'edge',
  'ghost-node',
  'ghost-edge',
  'folder',
  'folder-collapsed',
  'folder-link'
];

const TASK_IDS = [
  'task-box',
  'flow',
  'run-running',
  'run-continuous',
  'run-passed',
  'run-failed',
  'run-stopped',
  'run-failed-to-start',
  'file-passed',
  'file-failed',
  'file-cached',
  'file-live'
];

type Expected = Record<string, unknown>;

type Pin = [rowId: string, selector: string, expectedOf: (row: LegendRow) => Expected];

const NO_STYLE: Expected = {};

const styleOf = (selector: string): Expected => {
  const rule = SHEET.find((block) => block.selector === selector);

  if (rule === undefined || !('style' in rule)) return NO_STYLE;

  const style: Expected = { ...rule.style };

  return style;
};

const rowOf = (id: string): LegendRow => {
  const rows = [...LEGEND_ROWS.packages, ...LEGEND_ROWS.tasks];
  const row = rows.find((candidate) => candidate.id === id);

  if (row === undefined) throw new Error(`no legend row ${id}`);

  return row;
};

const outlineOf = (row: LegendRow): LegendOutline => {
  const { outline } = row.swatch;

  if (outline === null) throw new Error(`legend row ${row.id} has no outline`);

  return outline;
};

const fillOf = (row: LegendRow): string => {
  const { fill } = row.swatch;

  if (fill === null) throw new Error(`legend row ${row.id} has no fill`);

  return COLOUR_OF[fill];
};

const cornerOf = (row: LegendRow): Expected => {
  const corner = { 'corner-radius': `${row.swatch.radiusPx}px` };

  return corner;
};

const borderOf = (row: LegendRow): Expected => {
  const border = { 'border-width': row.swatch.strokePx, 'border-color': COLOUR_OF[row.swatch.stroke] };

  return border;
};

const packageOf = (row: LegendRow): Expected => {
  const corner = cornerOf(row);
  const border = borderOf(row);
  const style = { ...corner, ...border, 'background-color': fillOf(row) };

  return style;
};

const weightOf = (row: LegendRow): Expected => {
  const fontWeight = row.swatch.isBold ? 'bold' : 'normal';
  const weight = { 'font-weight': fontWeight };

  return weight;
};

const boldFillOf = (row: LegendRow): Expected => {
  const weight = weightOf(row);
  const style = { ...weight, 'background-color': fillOf(row) };

  return style;
};

const lineOf = (row: LegendRow): Expected => {
  const line = { width: row.swatch.strokePx, 'line-color': COLOUR_OF[row.swatch.stroke] };

  return line;
};

const edgeOf = (row: LegendRow): Expected => {
  const line = lineOf(row);
  const arrowShape = row.swatch.isArrow ? 'triangle' : 'none';
  const edge = { ...line, 'target-arrow-shape': arrowShape };

  return edge;
};

const ghostEdgeOf = (row: LegendRow): Expected => {
  const ghostEdge = { 'line-style': 'dashed', 'line-dash-pattern': row.swatch.dashPx };

  return ghostEdge;
};

const folderOf = (row: LegendRow): Expected => {
  const corner = cornerOf(row);
  const folder = { ...corner, 'border-width': row.swatch.strokePx };

  return folder;
};

const outlineStyleOf = (row: LegendRow): Expected => {
  const outline = outlineOf(row);
  const style = { 'outline-width': outline.px, 'outline-color': COLOUR_OF[outline.colour] };

  return style;
};

const dashedBorderOf = (row: LegendRow): Expected => {
  const dashed = { 'border-style': 'dashed', 'border-dash-pattern': row.swatch.dashPx };

  return dashed;
};

const dimmedOf = (row: LegendRow): Expected => {
  const opacity = row.swatch.isDimmed ? COLORS.dimmedOpacity : 1;
  const dimmed = { opacity };

  return dimmed;
};

const plateOf = (row: LegendRow): Expected => {
  const isPlated = row.swatch.hasPlate;
  const label = isPlated ? 'data(label)' : '';
  const plateColour = isPlated ? COLORS.background : 'none';
  const plate = { label, 'text-background-color': plateColour };

  return plate;
};

const RUN_PINS: Pin[] = RUN_STATES.map((state): Pin => [`run-${state}`, `node.run-${state}`, outlineStyleOf]);

const PINS: Pin[] = [
  ['package', 'node', packageOf],
  ['selected', 'node.selected', borderOf],
  ['selected', 'node.selected:childless', boldFillOf],
  ['focus-target', 'node.focus-target', weightOf],
  ['highlighted', 'node.highlighted', borderOf],
  ['dimmed', '.dimmed', dimmedOf],
  ['edge', 'edge', edgeOf],
  ['ghost-node', 'node.ghost', dashedBorderOf],
  ['ghost-edge', 'edge', edgeOf],
  ['ghost-edge', 'edge.ghost', ghostEdgeOf],
  ['folder', 'node:parent', folderOf],
  ['folder-collapsed', 'node.folder-node', cornerOf],
  ['folder-link', 'edge', edgeOf],
  ['folder-link', 'edge.folder-link', plateOf],
  ['task-box', 'node:parent.task-box', dashedBorderOf],
  ['task-box', 'node:parent', cornerOf],
  ['flow', 'edge.highlighted', lineOf],
  ...RUN_PINS,
  ['file-passed', 'node.atom-passed', outlineStyleOf],
  ['file-failed', 'node.atom-failed', outlineStyleOf],
  ['file-cached', 'node.atom-cached', outlineStyleOf],
  ['file-passed', 'node.atom-file', cornerOf],
  ['file-live', 'node.atom-live', dashedBorderOf]
];

const ORIGIN: Position = { x: 0, y: 0 };

const CORNER: Position = { x: 1, y: 1 };

const FLOW_SEGMENT: FlowSegment = { from: ORIGIN, control: null, to: CORNER };

describe('FEATURE: legend rows', () => {
  describe('GIVEN the package rows', () => {
    it('THEN they are the eleven of spec D9 with unique ids', () => {
      expect(LEGEND_ROWS.packages.map((row) => row.id)).toStrictEqual(PACKAGE_IDS);
    });
  });

  describe('GIVEN the task rows', () => {
    it('THEN they are the twelve of spec D9 and UB5b with unique ids', () => {
      expect(LEGEND_ROWS.tasks.map((row) => row.id)).toStrictEqual(TASK_IDS);
    });

    it('THEN the continuous row follows the running row and reads Task continuous', () => {
      const ids = LEGEND_ROWS.tasks.map((row) => row.id);
      const { text } = rowOf('run-continuous');

      expect(ids.indexOf('run-continuous')).toBe(ids.indexOf('run-running') + 1);
      expect(text).toBe('Task continuous');
    });
  });

  describe('GIVEN the flow row', () => {
    it('THEN its text names the edge limit and the idle seconds', () => {
      const { text } = rowOf('flow');

      expect(text).toContain(`over ${FLOW_EDGE_LIMIT} edges`);
      expect(text).toContain('stops after 3 s idle');
    });
  });

  describe('GIVEN each row pinned to the stylesheet', () => {
    it.each(PINS)('THEN row %s matches what the rule %s draws', (rowId, selector, expectedOf) => {
      const row = rowOf(rowId);
      const style = styleOf(selector);

      expect(style).toMatchObject(expectedOf(row));
    });
  });

  describe('GIVEN the flow row and the flow pen', () => {
    it('WHEN drawFlow strokes a segment THEN the pen takes the width and dashes the swatch says', () => {
      const row = rowOf('flow');
      const pen = flowPenMock();

      drawFlow(pen, [FLOW_SEGMENT], '#000', 0);

      expect(pen.lineWidth).toBe(outlineOf(row).px);
      expect(pen.setLineDash).toHaveBeenCalledWith(row.swatch.dashPx);
    });
  });
});
