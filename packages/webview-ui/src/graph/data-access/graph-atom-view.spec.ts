import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAtomCanvas } from './graph-atom-view.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphAtomOutcome } from '../../bridge/common/graph-message.type.ts';
import type { GraphAtomFile, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomBoxSpec } from '../common/atom-layout.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { AtomCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const UMBRELLA_SIZE: NodeSize = { width: 160, height: 52 };

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const UMBRELLA_AT: Position = { x: 180, y: 126 };

const API_AT: Position = { x: 400, y: 126 };

const SPACED = 'web#e2e-ci--tests/b fails.spec.ts';

const FILES: GraphAtomFile[] = [
  { id: 'web#e2e-ci--tests/spec-001.live.spec.ts', specPath: 'tests/spec-001.live.spec.ts', isLive: true },
  { id: SPACED, specPath: 'tests/b fails.spec.ts', isLive: false },
  { id: 'web#e2e-ci--tests/spec-003.spec.ts', specPath: 'tests/spec-003.spec.ts', isLive: false }
];

const FILE_IDS = FILES.map((file) => file.id);

const SPEC: AtomBoxSpec = { umbrellaId: 'web#e2e-ci', umbrellaSize: UMBRELLA_SIZE, fileIds: FILE_IDS };

const GHOST_SPEC: AtomBoxSpec = { ...SPEC, umbrellaId: 'ghost#e2e-ci' };

const OUTCOMES: Record<string, GraphAtomOutcome> = {
  [FILE_IDS[0] ?? '']: 'passed',
  [SPACED]: 'failed',
  [FILE_IDS[2] ?? '']: 'none'
};

const DRAWN_AT: Positions = { 'web#e2e-ci': UMBRELLA_AT, 'api#build': API_AT };

const DRAWING: TaskDrawing = {
  tasks: [taskOf('web#e2e-ci', []), taskOf('api#build', [])],
  positions: DRAWN_AT,
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map([['web#e2e-ci', UMBRELLA_SIZE]]),
  labels: new Map([['web#e2e-ci', '3 files']])
};

const idOf = (node: NodeSingular): string => node.id();

const parentIdOf = (cy: Core, id: string): string => {
  const parents = cy.getElementById(id).parent();
  const [parentId = ''] = parents.map(idOf);

  return parentId;
};

const BOX_ID = 'atom:web#e2e-ci';

const fileOf = (id: string): GraphAtomFile => {
  const file: GraphAtomFile = { id, specPath: 'tests/x.spec.ts', isLive: false };

  return file;
};

const BOX_TASK_DATA = { id: BOX_ID };

/** A task node that happens to have the id of the box. */
const boxTaskOf = (): ElementDefinition => {
  const task: ElementDefinition = { data: BOX_TASK_DATA, classes: 'task' };

  return task;
};

const CONSTRUCTOR_SPEC: AtomBoxSpec = { ...SPEC, fileIds: ['constructor'] };

const nodeIdsOf = (cy: Core): string[] => {
  const ids = cy.nodes().map(idOf);

  return ids.sort();
};

describe('FEATURE: createAtomCanvas', () => {
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

  describe('GIVEN an umbrella of three files inside its package box', () => {
    describe('WHEN the group expands', () => {
      beforeEach(() => {
        atoms.expand(SPEC, 'pkg:web', FILES, OUTCOMES);
      });

      it('THEN the box atom:<id> is an atom-box in the package box and holds the umbrella', () => {
        const box = cy.getElementById('atom:web#e2e-ci');

        expect(box.hasClass('atom-box')).toBe(true);
        expect(parentIdOf(cy, 'atom:web#e2e-ci')).toBe('pkg:web');
        expect(parentIdOf(cy, 'web#e2e-ci')).toBe('atom:web#e2e-ci');
      });

      it('THEN each file is an atom-file, not a task, in the box at the file size with the last path segment as its label', () => {
        const file = cy.getElementById(SPACED);

        expect(file.hasClass('atom-file')).toBe(true);
        expect(file.hasClass('task')).toBe(false);
        expect(parentIdOf(cy, SPACED)).toBe('atom:web#e2e-ci');
        expect([file.data('width'), file.data('height'), file.data('label')]).toStrictEqual([96, 20, 'b fails.spec.ts']);
      });

      it('THEN a failed file takes atom-failed, a passed file atom-passed, a file with no outcome none', () => {
        const classesOf = (id: string): string[] => cy.getElementById(id).classes().sort();

        expect(classesOf(SPACED)).toStrictEqual(['atom-failed', 'atom-file']);
        expect(classesOf(FILE_IDS[0] ?? '')).toStrictEqual(['atom-file', 'atom-live', 'atom-passed']);
        expect(classesOf(FILE_IDS[2] ?? '')).toStrictEqual(['atom-file']);
      });

      it('THEN the umbrella stays a task and no other node is added or removed', () => {
        const umbrella = cy.getElementById('web#e2e-ci');

        expect(umbrella.hasClass('task')).toBe(true);
        const expected = ['api#build', 'atom:web#e2e-ci', 'pkg:api', 'pkg:web', 'web#e2e-ci', ...FILE_IDS];
        const sorted = expected.sort();

        expect(nodeIdsOf(cy)).toStrictEqual(sorted);
      });
    });

    describe('WHEN the group expands and collapses', () => {
      it('THEN the umbrella is back in its package box and the box and files are gone', () => {
        const before = nodeIdsOf(cy);

        atoms.expand(SPEC, 'pkg:web', FILES, OUTCOMES);
        atoms.collapse('web#e2e-ci', 'pkg:web');

        expect(parentIdOf(cy, 'web#e2e-ci')).toBe('pkg:web');
        expect(nodeIdsOf(cy)).toStrictEqual(before);
      });
    });

    describe('WHEN the group is not drawn', () => {
      it('THEN expanding an unknown umbrella adds nothing', () => {
        const before = nodeIdsOf(cy);

        atoms.expand(GHOST_SPEC, 'pkg:ghost', FILES, OUTCOMES);

        expect(nodeIdsOf(cy)).toStrictEqual(before);
      });

      it('THEN collapsing a group that is not open changes nothing', () => {
        const before = nodeIdsOf(cy);

        atoms.collapse('web#e2e-ci', 'pkg:web');

        expect(nodeIdsOf(cy)).toStrictEqual(before);
        expect(parentIdOf(cy, 'web#e2e-ci')).toBe('pkg:web');
      });
    });
  });

  describe('GIVEN a group is asked to expand', () => {
    it('WHEN its umbrella is drawn and its box id is free THEN expand reports it drew', () => {
      expect(atoms.expand(SPEC, 'pkg:web', FILES, OUTCOMES)).toBe(true);
    });

    it('WHEN its umbrella is not drawn THEN expand reports it drew nothing', () => {
      expect(atoms.expand(GHOST_SPEC, 'pkg:ghost', FILES, OUTCOMES)).toBe(false);
    });

    it('WHEN a task has the id of its box THEN expand reports it drew nothing', () => {
      cy.add(boxTaskOf());

      expect(atoms.expand(SPEC, 'pkg:web', FILES, OUTCOMES)).toBe(false);
    });
  });

  describe('GIVEN a node of the canvas already holds an id the group needs', () => {
    it('WHEN a task has the id of the box THEN expanding draws nothing and throws nothing', () => {
      cy.add(boxTaskOf());
      const before = nodeIdsOf(cy);

      expect(() => atoms.expand(SPEC, 'pkg:web', FILES, OUTCOMES)).not.toThrow();
      expect(nodeIdsOf(cy)).toStrictEqual(before);
      expect(parentIdOf(cy, 'web#e2e-ci')).toBe('pkg:web');
    });

    it('WHEN a task has the id of the box THEN collapsing keeps that task', () => {
      cy.add(boxTaskOf());

      atoms.collapse('web#e2e-ci', 'pkg:web');

      expect(cy.getElementById(BOX_ID).nonempty()).toBe(true);
    });

    it('WHEN a file id is named like an inherited member THEN the file takes no outcome class', () => {
      atoms.expand(CONSTRUCTOR_SPEC, 'pkg:web', [fileOf('constructor')], {});

      expect(cy.getElementById('constructor').classes()).toStrictEqual(['atom-file']);
    });
  });

  describe('GIVEN the group is expanded on a canvas with a container', () => {
    let container: HTMLElement;

    beforeEach(() => {
      vi.stubGlobal('document', fakeDocumentMock());
      container = document.createElement('div');
      vi.spyOn(cy, 'container').mockReturnValue(container);
      atoms.expand(SPEC, 'pkg:web', FILES, OUTCOMES);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('WHEN the pointer enters a file THEN the container title is its spec path', () => {
      cy.getElementById(FILE_IDS[0] ?? '').emit('mouseover');

      expect(container.getAttribute('title')).toBe('tests/spec-001.live.spec.ts');
    });

    it.each([
      ['the pointer leaves the file', (): void => void cy.getElementById(SPACED).emit('mouseout')],
      ['the pointer leaves the canvas from the file', (): void => void cy.emit('mouseout')],
      ['the group collapses', (): void => atoms.collapse('web#e2e-ci', 'pkg:web')]
    ])('WHEN a file is hovered and %s THEN the container has no title', (_name, leave) => {
      cy.getElementById(SPACED).emit('mouseover');
      leave();

      expect(container.getAttribute('title')).toBeNull();
    });

    it('WHEN the pointer enters the umbrella THEN the container has no title', () => {
      cy.getElementById('web#e2e-ci').emit('mouseover');

      expect(container.getAttribute('title')).toBeNull();
    });
  });

  describe('GIVEN the group is expanded and nodes are asked about', () => {
    beforeEach(() => {
      atoms.expand(SPEC, 'pkg:web', FILES, OUTCOMES);
    });

    it.each([
      ['the box', true, BOX_ID],
      ['a file', true, SPACED],
      ['the umbrella', false, 'web#e2e-ci'],
      ['another task', false, 'api#build'],
      ['an id nothing holds', false, 'ghost'],
      ['an empty id', false, '']
    ])('WHEN %s is asked about THEN isAtomNode is %s', (_name, expected, id) => {
      expect(atoms.isAtomNode(id)).toBe(expected);
    });
  });

  describe('GIVEN the group is expanded', () => {
    beforeEach(() => {
      atoms.expand(SPEC, 'pkg:web', FILES, OUTCOMES);
    });

    it('WHEN positions are set THEN every drawn node in them moves and an id not drawn is skipped', () => {
      const umbrellaAt: Position = { x: 1, y: 2 };
      const spacedAt: Position = { x: 3, y: 4 };
      const ghostAt: Position = { x: 5, y: 6 };
      const positions: Positions = { 'web#e2e-ci': umbrellaAt, [SPACED]: spacedAt, ghost: ghostAt };

      atoms.setPositions(positions);

      expect(cy.getElementById('web#e2e-ci').position()).toStrictEqual({ x: 1, y: 2 });
      expect(cy.getElementById(SPACED).position()).toStrictEqual({ x: 3, y: 4 });
      expect(cy.getElementById('api#build').position()).toStrictEqual(API_AT);
    });

    it('WHEN outcomes are set THEN each file in them swaps its outcome class and no position moves', () => {
      const spacedAt: Position = { x: 3, y: 4 };
      const positions: Positions = { [SPACED]: spacedAt };

      atoms.setPositions(positions);
      atoms.setOutcomes({ [SPACED]: 'cached', [FILE_IDS[2] ?? '']: 'failed', ghost: 'passed' });

      const classes = cy.getElementById(SPACED).classes().sort();

      expect(classes).toStrictEqual(['atom-cached', 'atom-file']);
      expect(cy.getElementById(FILE_IDS[2] ?? '').hasClass('atom-failed')).toBe(true);
      expect(cy.getElementById(SPACED).position()).toStrictEqual({ x: 3, y: 4 });
    });

    it('WHEN an outcome names a task id THEN the task takes no outcome class', () => {
      atoms.setOutcomes({ 'api#build': 'failed' });

      expect(cy.getElementById('api#build').hasClass('atom-failed')).toBe(false);
    });

    it('WHEN grabbing is switched off and on THEN the canvas ungrabifies and grabifies its nodes', () => {
      atoms.setGrabbable(false);
      const whileOff = cy.autoungrabify();

      atoms.setGrabbable(true);

      expect([whileOff, cy.autoungrabify()]).toStrictEqual([true, false]);
    });
  });
});
