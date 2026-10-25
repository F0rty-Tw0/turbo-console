import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAtomCanvas } from './graph-atom-view.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphAtomFile, GraphAtomGroup, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { AtomCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';
import { atomSpecOf } from '../utils/atom-spec.util.ts';

const UMBRELLA_SIZE: NodeSize = { width: 160, height: 52 };

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const FREE_ID = 'web#e2e-ci--a';

const CLASH_ID = 'web#build';

const fileOf = (id: string): GraphAtomFile => {
  const file: GraphAtomFile = { id, specPath: 'a.spec.ts', isLive: false };

  return file;
};

const GROUP: GraphAtomGroup = { umbrellaId: 'web#e2e-ci', files: [fileOf(FREE_ID), fileOf(CLASH_ID)] };

const UMBRELLA_AT: Position = { x: 180, y: 126 };

const CLASH_AT: Position = { x: 400, y: 126 };

const POSITIONS: Positions = { 'web#e2e-ci': UMBRELLA_AT, [CLASH_ID]: CLASH_AT };

const SIZES = new Map([['web#e2e-ci', UMBRELLA_SIZE]]);

const DRAWING: TaskDrawing = {
  tasks: [taskOf('web#e2e-ci', []), taskOf(CLASH_ID, [])],
  positions: POSITIONS,
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: SIZES,
  labels: new Map([['web#e2e-ci', '2 files']])
};

const PKG_BOXES = new Map([
  ['web#e2e-ci', 'pkg:web'],
  [CLASH_ID, 'pkg:web']
]);

const PLACEMENT: AtomPlacement = {
  shown: new Set(['web#e2e-ci', CLASH_ID]),
  base: POSITIONS,
  sizes: SIZES,
  pkgBoxes: PKG_BOXES
};

const parentIdOf = (cy: Core, id: string): string => {
  const [parent] = cy.getElementById(id).parent();

  return parent?.id() ?? '';
};

describe('FEATURE: createAtomCanvas drawing the spec files', () => {
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

  describe('GIVEN a group with a file whose id is a task already on the canvas', () => {
    describe('WHEN the spec atomSpecOf made expands', () => {
      let isDrawn: boolean;

      beforeEach(() => {
        const spec = atomSpecOf(GROUP, PLACEMENT, {});

        if (spec === null) throw new Error('the group has a free file, so it has a spec');

        isDrawn = atoms.expand(spec, 'pkg:web', {});
      });

      it('THEN it draws the box', () => {
        expect(isDrawn).toBe(true);
      });

      it('THEN the box holds one atom-file, the free file', () => {
        const files = cy.nodes('.atom-file');

        expect(files.map((node) => node.id())).toStrictEqual([FREE_ID]);
      });

      it('THEN the task keeps its class and its parent', () => {
        const task = cy.getElementById(CLASH_ID);

        expect(task.hasClass('task')).toBe(true);
        expect(task.hasClass('atom-file')).toBe(false);
        expect(parentIdOf(cy, CLASH_ID)).toBe('pkg:web');
      });
    });
  });
});
