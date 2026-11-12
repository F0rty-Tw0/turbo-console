import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAtomCanvas } from './graph-atom-view.ts';
import { graphStyleOf } from './graph-style.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { AtomCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const UMBRELLA = 'web#e2e-ci';

const TARGET = 'api#build';

const LINK_ID = edgeIdOf({ source: UMBRELLA, target: TARGET });

const UMBRELLA_AT: Position = { x: 180, y: 126 };

const TARGET_AT: Position = { x: 180, y: 326 };

const DRAWN_AT: Positions = { [UMBRELLA]: UMBRELLA_AT, [TARGET]: TARGET_AT };

const DRAWING: TaskDrawing = {
  tasks: [taskOf(UMBRELLA, [TARGET]), taskOf(TARGET, [])],
  positions: DRAWN_AT,
  boxFrames: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map(),
  counts: new Map(),
  titleWidths: new Map(),
  rootLabel: null,
  naming: NAMING_STUB
};

const BOX_BOTTOM_END = '0px 100px';

describe('FEATURE: createAtomCanvas setLinkEnds', () => {
  let cy: Core;
  let atoms: AtomCanvas;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };

    cy = cytoscape({ headless: true, layout });
    createTaskCanvas(cy).show(DRAWING);
    atoms = createAtomCanvas(cy);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a link between two drawn tasks', () => {
    it('WHEN its source end is set THEN it carries that end as data(srcEnd)', () => {
      atoms.setLinkEnds(new Map([[LINK_ID, BOX_BOTTOM_END]]));

      expect(cy.getElementById(LINK_ID).data('srcEnd')).toBe(BOX_BOTTOM_END);
    });

    it('WHEN an end is set for a link not drawn THEN no element is added', () => {
      const before = cy.elements().length;

      atoms.setLinkEnds(new Map([['edge:missing', BOX_BOTTOM_END]]));

      expect(cy.elements()).toHaveLength(before);
    });
  });

  describe('GIVEN a link with a source end', () => {
    it('WHEN it is set to null THEN it carries no source end, so it leaves its source at the border again', () => {
      atoms.setLinkEnds(new Map([[LINK_ID, BOX_BOTTOM_END]]));

      atoms.setLinkEnds(new Map([[LINK_ID, null]]));

      expect(cy.getElementById(LINK_ID).data('srcEnd')).toBeUndefined();
    });
  });
});

describe('FEATURE: createAtomCanvas setLinkEnds under the graph stylesheet', () => {
  let cy: Core;
  let atoms: AtomCanvas;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };

    cy = cytoscape({ headless: true, styleEnabled: true, layout });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
    createTaskCanvas(cy).show(DRAWING);
    atoms = createAtomCanvas(cy);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a link with a source end', () => {
    it('WHEN its source end is set THEN it is drawn from that end', () => {
      atoms.setLinkEnds(new Map([[LINK_ID, BOX_BOTTOM_END]]));

      expect(cy.getElementById(LINK_ID).style('source-endpoint')).toBe(BOX_BOTTOM_END);
    });

    it('WHEN it is drawn from that end, then set to null THEN it is drawn from its source border again', () => {
      const link = cy.getElementById(LINK_ID);

      atoms.setLinkEnds(new Map([[LINK_ID, BOX_BOTTOM_END]]));
      const opened: unknown = link.style('source-endpoint');

      atoms.setLinkEnds(new Map([[LINK_ID, null]]));
      const closed: unknown = link.style('source-endpoint');

      expect([opened, closed]).toStrictEqual([BOX_BOTTOM_END, 'outside-to-node']);
    });
  });
});
