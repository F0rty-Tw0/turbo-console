import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAtomCanvas } from './graph-atom-view.ts';
import { graphStyleOf } from './graph-style.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphAtomGroup, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomDrawSpec } from '../common/atom-layout.type.ts';
import type { AtomPlacement } from '../common/graph-atom.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { AtomCanvas, TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { fileOf } from '../test/utils/atom-file.spec.util.ts';
import { CANVAS_COLORS } from '../test/utils/canvas-elements.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';
import { atomSpecOf } from '../utils/atom-spec.util.ts';

const UMBRELLA_SIZE: NodeSize = { width: 160, height: 52 };

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const FREE_ID = 'web#e2e-ci--a';

const CLASH_ID = 'web#build';

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
  labels: new Map([['web#e2e-ci', '2 files']]),
  titleWidths: new Map()
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

const MORE_ID = 'atom-more:web#e2e-ci';

const MORE_SPEC: AtomDrawSpec = {
  umbrellaId: 'web#e2e-ci',
  umbrellaSize: UMBRELLA_SIZE,
  fileIds: [FREE_ID, MORE_ID],
  files: [fileOf(FREE_ID)],
  hidden: 2
};

describe('FEATURE: createAtomCanvas drawing the spec files and the count node', () => {
  let cy: Core;
  let tasks: TaskCanvas;
  let atoms: AtomCanvas;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };

    cy = cytoscape({ headless: true, styleEnabled: true, layout });
    cy.style(graphStyleOf(CANVAS_COLORS, 'sans-serif', false));
    tasks = createTaskCanvas(cy);
    atoms = createAtomCanvas(cy);
    tasks.show(DRAWING);
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

      it('THEN the task keeps its task class and takes no atom-file class', () => {
        const task = cy.getElementById(CLASH_ID);

        expect(task.classes()).toContain('task');
        expect(task.classes()).not.toContain('atom-file');
      });

      it('THEN the task keeps its parent', () => {
        expect(parentIdOf(cy, CLASH_ID)).toBe('pkg:web');
      });
    });
  });

  describe('GIVEN a spec with 2 hidden files', () => {
    beforeEach(() => {
      atoms.expand(MORE_SPEC, 'pkg:web', {});
    });

    it('WHEN it expands THEN the count node is in the box', () => {
      expect(parentIdOf(cy, MORE_ID)).toBe('atom:web#e2e-ci');
    });

    it('WHEN it expands THEN the count node has only the atom-more class', () => {
      expect(cy.getElementById(MORE_ID).classes()).toStrictEqual(['atom-more']);
    });

    it('WHEN it expands THEN the count node has the file size', () => {
      const more = cy.getElementById(MORE_ID);

      expect([more.data('width'), more.data('height')]).toStrictEqual([96, 20]);
    });

    it('WHEN it expands THEN the count node reads +2 more, not its id', () => {
      expect(cy.getElementById(MORE_ID).data('label')).toBe('+2 more');
      expect(cy.getElementById(MORE_ID).style('label')).toBe('+2 more');
    });

    it('WHEN the group is asked THEN the count node is an atom node', () => {
      expect(atoms.isAtomNode(MORE_ID)).toBe(true);
    });

    it('WHEN an outcome arrives for the count node THEN it takes no outcome class', () => {
      atoms.setOutcomes({ [MORE_ID]: 'failed' });

      expect(cy.getElementById(MORE_ID).classes()).toStrictEqual(['atom-more']);
    });

    it('WHEN a run state arrives for the count node THEN it takes no run class', () => {
      tasks.runStates({ [MORE_ID]: 'running' });
      tasks.remark();

      expect(cy.getElementById(MORE_ID).classes()).toStrictEqual(['atom-more']);
    });

    it('WHEN the group collapses THEN the count node is gone', () => {
      atoms.collapse('web#e2e-ci', 'pkg:web');

      expect(cy.getElementById(MORE_ID).empty()).toBe(true);
    });
  });

  describe('GIVEN a spec with 2 hidden files expanded on a canvas with a container', () => {
    let container: HTMLElement;

    beforeEach(() => {
      vi.stubGlobal('document', fakeDocumentMock());
      container = document.createElement('div');
      vi.spyOn(cy, 'container').mockReturnValue(container);
      atoms.expand(MORE_SPEC, 'pkg:web', {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('WHEN the pointer enters the count node THEN the container has no title', () => {
      cy.getElementById(MORE_ID).emit('mouseover');

      expect(container.getAttribute('title')).toBeNull();
    });

    it('WHEN the pointer moves on the count node THEN the container has no title', () => {
      cy.getElementById(MORE_ID).emit('mousemove');

      expect(container.getAttribute('title')).toBeNull();
    });
  });

  it('GIVEN a spec with no hidden file WHEN it expands THEN no count node is drawn', () => {
    atoms.expand({ ...MORE_SPEC, fileIds: [FREE_ID], hidden: 0 }, 'pkg:web', {});

    expect(cy.nodes('.atom-more').empty()).toBe(true);
  });
});
