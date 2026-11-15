import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAtomCanvas } from './graph-atom-view.ts';
import { graphStyleOf } from './graph-style.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { AtomCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { CARD_MEASURES_STUB } from '../test/stubs/graph-card.stub.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const UMBRELLA_SIZE: NodeSize = { width: 160, height: 52 };

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const UMBRELLA_AT: Position = { x: 180, y: 126 };

const API_AT: Position = { x: 400, y: 126 };

const DRAWN_AT: Positions = { 'web#e2e-ci': UMBRELLA_AT, 'api#build': API_AT };

const DRAWING: TaskDrawing = {
  tasks: [taskOf('web#e2e-ci', []), taskOf('api#build', [])],
  positions: DRAWN_AT,
  boxFrames: {},
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map([['web#e2e-ci', UMBRELLA_SIZE]]),
  counts: new Map([['web#e2e-ci', { files: 3, cached: null, failed: null }]]),
  titleWidths: new Map(),
  rootLabel: null,
  naming: NAMING_STUB
};

describe('FEATURE: createAtomCanvas boxOf on the styled canvas', () => {
  let cy: Core;
  let atoms: AtomCanvas;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };

    cy = cytoscape({ headless: true, styleEnabled: true, layout });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false, CARD_MEASURES_STUB));
    createTaskCanvas(cy).show(DRAWING);
    atoms = createAtomCanvas(cy);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN the umbrella drawn at its centre with its size', () => {
    it('WHEN its box is read THEN it is the drawn centre and the sized width', () => {
      const box = atoms.boxOf('web#e2e-ci');

      expect(box).toStrictEqual({ centre: UMBRELLA_AT, width: UMBRELLA_SIZE.width });
    });

    it('WHEN the box of an id not drawn is read THEN it is null', () => {
      expect(atoms.boxOf('nope')).toBeNull();
    });
  });
});
