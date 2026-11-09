import cytoscape from 'cytoscape';
import type { BoundingBox12, Core } from 'cytoscape';
import type { ElkNode } from 'elkjs/lib/elk-api.js';
import elkConstructor from 'elkjs/lib/elk.bundled.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { graphStyleOf } from './graph-style.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskDrawing } from '../common/task-canvas.type.ts';
import { REAL_ELK_TIMEOUT_MS } from '../test/common/real-elk.const.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { frameLineOf, sideErrorOf } from '../test/utils/box-frame.spec.util.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';
import { nestedCentresOf } from '../utils/elk-centres.util.ts';
import { boxFramesOf } from '../utils/elk-frames.util.ts';
import { routesOf } from '../utils/elk-routes.util.ts';
import { elkTaskGraphOf } from '../utils/elk-task-graph.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const SIZE_OF = (): NodeSize => NODE_SIZE;

const PRESET = { name: 'preset', fit: false };

/** `hub#build` depends on `a#build` alone in `a` and on both tasks of `b`; `a`'s title is far wider than its task. */
const TASKS: GraphTask[] = [
  taskOf('a#build', []),
  taskOf('b#build', []),
  taskOf('b#lint', []),
  taskOf('hub#build', ['a#build', 'b#build', 'b#lint'])
];

const TITLE_WIDTHS: ReadonlyMap<string, number> = new Map([
  ['a', 220],
  ['b', 30],
  ['hub', 30]
]);

const NO_BOX: BoundingBox12 = { x1: 0, x2: 0, y1: 0, y2: 0 };

type RectEntry = [string, BoundingBox12];

const numberOf = (value: number | undefined): number => value ?? 0;

/** The rect of `node` and of every node under it by id, its parent's corner sitting at `(originX, originY)`. */
const elkRectsOf = (node: ElkNode, originX: number, originY: number): RectEntry[] => {
  const x1 = originX + numberOf(node.x);
  const y1 = originY + numberOf(node.y);
  const own: BoundingBox12 = { x1, x2: x1 + numberOf(node.width), y1, y2: y1 + numberOf(node.height) };
  const children = node.children ?? [];
  const under = children.flatMap((child) => elkRectsOf(child, x1, y1));

  return [[node.id, own], ...under];
};

/** The ELK rect of the node `id`; `NO_BOX` when absent. */
const elkRectOf = (laidOut: ElkNode, id: string): BoundingBox12 => {
  const entries = elkRectsOf(laidOut, 0, 0);
  const rects = new Map(entries);

  return rects.get(id) ?? NO_BOX;
};

/** Whether the span `start..end` meets the span `otherStart..otherEnd`. */
const isSpanMet = (start: number, end: number, otherStart: number, otherEnd: number): boolean => start < otherEnd && otherStart < end;

const isOverlapping = (one: BoundingBox12, other: BoundingBox12): boolean => {
  const isAcross = isSpanMet(one.x1, one.x2, other.x1, other.x2);
  const isAlong = isSpanMet(one.y1, one.y2, other.y1, other.y2);

  return isAcross && isAlong;
};

const drawingOf = (laidOut: ElkNode): TaskDrawing => {
  const drawing: TaskDrawing = {
    tasks: TASKS,
    positions: nestedCentresOf(laidOut),
    routes: routesOf(laidOut),
    boxFrames: boxFramesOf(laidOut),
    sizeOf: SIZE_OF,
    sizes: new Map(),
    labels: new Map(),
    titleWidths: TITLE_WIDTHS,
    rootLabel: null,
    naming: NAMING_STUB
  };

  return drawing;
};

describe('FEATURE: createTaskCanvas box frames on a real ELK layout', () => {
  describe('GIVEN the one-task box pkg:a, its title 220 px over an 80 px task, beside the two-task box pkg:b', () => {
    let cy: Core;
    let laidOut: ElkNode;

    beforeEach(async () => {
      const shown = new Set(TASKS.map((task) => task.id));
      const graph = elkTaskGraphOf({ tasks: TASKS, shown, sizes: new Map(), titleWidths: TITLE_WIDTHS, naming: NAMING_STUB }, SIZE_OF);
      const style = graphStyleOf(CANVAS_COLORS, 'sans-serif', false);

      laidOut = await new elkConstructor().layout(graph);
      cy = cytoscape({ headless: true, styleEnabled: true, layout: PRESET, style });
      createTaskCanvas(cy).show(drawingOf(laidOut));
    }, REAL_ELK_TIMEOUT_MS);

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN shown THEN pkg:a is drawn on its ELK box, within 1 px of each side', () => {
      const drawn = frameLineOf(cy.getElementById('pkg:a'));

      expect(sideErrorOf(drawn, elkRectOf(laidOut, 'pkg:a'))).toBeLessThanOrEqual(1);
    });

    it('WHEN shown THEN pkg:a does not overlap pkg:b', () => {
      const drawnA = frameLineOf(cy.getElementById('pkg:a'));
      const drawnB = frameLineOf(cy.getElementById('pkg:b'));

      expect(isOverlapping(drawnA, drawnB)).toBe(false);
    });
  });
});
