import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAtomCanvas } from './graph-atom-view.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import { BOX_FRAMED_CLASS } from '../common/graph-task.const.ts';
import type { BoxFrame, BoxFrames } from '../common/layout.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { AtomCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { NAMING_STUB } from '../test/stubs/graph-task.stub.ts';
import { fileOf } from '../test/utils/atom-file.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const UMBRELLA_SIZE: NodeSize = { width: 160, height: 52 };

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const UMBRELLA_AT: Position = { x: 180, y: 126 };

const API_AT: Position = { x: 400, y: 126 };

const FILE = fileOf('web#e2e-ci--tests/a.spec.ts', 'tests/a.spec.ts');

const SPEC: AtomDrawSpec = { umbrellaId: 'web#e2e-ci', umbrellaSize: UMBRELLA_SIZE, fileIds: [FILE.id], files: [FILE], hidden: 0 };

/** `pkg:web` as ELK framed it around its one task, the umbrella `web#e2e-ci`. */
const FRAME: BoxFrame = { leafId: 'web#e2e-ci', left: -150, right: 150, top: -70, bottom: 60, titleX: -60, titleY: -62 };

const FRAMES: BoxFrames = { 'pkg:web': FRAME };

const DRAWN_AT: Positions = { 'web#e2e-ci': UMBRELLA_AT, 'api#build': API_AT };

/** The umbrella `web#e2e-ci` alone in `pkg:web`, `api#build` alone in `pkg:api`; only `pkg:web` has a frame. */
const DRAWING: TaskDrawing = {
  tasks: [taskOf('web#e2e-ci', []), taskOf('api#build', [])],
  positions: DRAWN_AT,
  boxFrames: FRAMES,
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map([['web#e2e-ci', UMBRELLA_SIZE]]),
  counts: new Map([['web#e2e-ci', { files: 1, cached: null, failed: null }]]),
  titleWidths: new Map(),
  rootLabel: null,
  naming: NAMING_STUB
};

type FrameState = [boolean, unknown];

const frameStateOf = (box: NodeSingular): FrameState => [box.hasClass(BOX_FRAMED_CLASS), box.data('boxFrame')];

describe('FEATURE: createAtomCanvas box frames', () => {
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

  describe('GIVEN the umbrella web#e2e-ci, the one task of the framed box pkg:web', () => {
    it('WHEN it expands THEN pkg:web drops box-framed and keeps its frame data', () => {
      atoms.expand(SPEC, 'pkg:web', {});

      expect(frameStateOf(cy.getElementById('pkg:web'))).toStrictEqual([false, FRAME]);
    });

    it('WHEN it expands and collapses THEN pkg:web is box-framed again with the same frame data', () => {
      atoms.expand(SPEC, 'pkg:web', {});
      atoms.collapse('web#e2e-ci', 'pkg:web');

      expect(frameStateOf(cy.getElementById('pkg:web'))).toStrictEqual([true, FRAME]);
    });
  });

  describe('GIVEN the box pkg:api with no frame', () => {
    it('WHEN an umbrella expands into it and collapses THEN pkg:api stays without box-framed', () => {
      const apiSpec: AtomDrawSpec = { ...SPEC, umbrellaId: 'api#build' };

      atoms.expand(apiSpec, 'pkg:api', {});
      atoms.collapse('api#build', 'pkg:api');

      expect(cy.getElementById('pkg:api').hasClass(BOX_FRAMED_CLASS)).toBe(false);
    });
  });
});
