import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAtomCanvas } from './graph-atom-view.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { ROUTED_CLASS } from '../common/graph-layout.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { RouteSegments } from '../common/route-segments.type.ts';
import type { AtomCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
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
  routes: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map(),
  labels: new Map(),
  titleWidths: new Map(),
  rootLabel: null,
  naming: NAMING_STUB
};

const SEGMENTS: RouteSegments = { segWeights: [0.6], segDistances: [-10], srcEnd: '10px 100px', tgtEnd: '10px -16px' };

describe('FEATURE: createAtomCanvas setSegments', () => {
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

  describe('GIVEN a straight link between two drawn tasks', () => {
    it('WHEN its segments are set THEN it is drawn on them as a routed link', () => {
      atoms.setSegments(new Map([[LINK_ID, SEGMENTS]]));

      const edge = cy.getElementById(LINK_ID);

      expect(edge.hasClass(ROUTED_CLASS)).toBe(true);
      expect(edge.data('srcEnd')).toBe(SEGMENTS.srcEnd);
      expect(edge.data('segWeights')).toStrictEqual(SEGMENTS.segWeights);
    });

    it('WHEN segments are set for a link not drawn THEN no element is added', () => {
      const before = cy.elements().length;

      atoms.setSegments(new Map([['edge:missing', SEGMENTS]]));

      expect(cy.elements()).toHaveLength(before);
    });
  });

  describe('GIVEN a link drawn on segments', () => {
    it('WHEN it is set to null THEN it is drawn straight again', () => {
      atoms.setSegments(new Map([[LINK_ID, SEGMENTS]]));

      atoms.setSegments(new Map([[LINK_ID, null]]));

      expect(cy.getElementById(LINK_ID).hasClass(ROUTED_CLASS)).toBe(false);
    });
  });
});
