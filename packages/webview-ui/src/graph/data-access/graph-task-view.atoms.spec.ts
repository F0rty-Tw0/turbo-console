import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAtomCanvas } from './graph-atom-view.ts';
import { probeStateOf } from './graph-probe-state.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphAtomFile, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomBoxSpec } from '../common/atom-layout.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { AtomCanvas, TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const UMBRELLA_SIZE: NodeSize = { width: 160, height: 52 };

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const UMBRELLA_AT: Position = { x: 180, y: 126 };

const API_AT: Position = { x: 400, y: 126 };

const POSITIONS: Positions = { 'web#e2e-ci': UMBRELLA_AT, 'api#build': API_AT };

const DRAWING: TaskDrawing = {
  tasks: [taskOf('web#e2e-ci', []), taskOf('api#build', [])],
  positions: POSITIONS,
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map([['web#e2e-ci', UMBRELLA_SIZE]]),
  labels: new Map()
};

const SIBLING_AT: Position = { x: 180, y: 300 };

const SIBLING_POSITIONS: Positions = { ...POSITIONS, 'web#build': SIBLING_AT };

const SIBLING_DRAWING: TaskDrawing = {
  ...DRAWING,
  tasks: [...DRAWING.tasks, taskOf('web#build', [])],
  positions: SIBLING_POSITIONS
};

const SPACED = 'web#e2e-ci--tests/b fails.spec.ts';

const FILES: GraphAtomFile[] = [{ id: SPACED, specPath: 'tests/b fails.spec.ts', isLive: false }];

const SPEC: AtomBoxSpec = { umbrellaId: 'web#e2e-ci', umbrellaSize: UMBRELLA_SIZE, fileIds: [SPACED] };

describe('FEATURE: the task canvas with an expanded Atomizer group', () => {
  let cy: Core;
  let tasks: TaskCanvas;
  let atoms: AtomCanvas;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };

    cy = cytoscape({ headless: true, layout });
    tasks = createTaskCanvas(cy);
    atoms = createAtomCanvas(cy);
    tasks.show(DRAWING);
  });

  afterEach(() => {
    cy.destroy();
  });

  describe('GIVEN a run is known for a file before its group expands', () => {
    beforeEach(() => {
      tasks.runStates({ [SPACED]: 'running' });
    });

    it('WHEN the group expands and the runs are marked again THEN the file takes run-running', () => {
      atoms.expand(SPEC, 'pkg:web', FILES, {});
      tasks.remark();

      expect(cy.getElementById(SPACED).hasClass('run-running')).toBe(true);
    });

    it('WHEN the group expands and the runs are not marked again THEN the file has no run class', () => {
      atoms.expand(SPEC, 'pkg:web', FILES, {});

      expect(cy.getElementById(SPACED).hasClass('run-running')).toBe(false);
    });

    it('WHEN the file then stops running THEN it loses run-running', () => {
      atoms.expand(SPEC, 'pkg:web', FILES, {});
      tasks.runStates({});

      expect(cy.getElementById(SPACED).hasClass('run-running')).toBe(false);
    });
  });

  describe('GIVEN the group is expanded and a task is selected', () => {
    beforeEach(() => {
      atoms.expand(SPEC, 'pkg:web', FILES, {});
    });

    it('WHEN the umbrella is the target THEN its package box is not dimmed, though its box sits between', () => {
      tasks.paint('web#e2e-ci');

      expect(probeStateOf(cy.getElementById('pkg:web'))).not.toBe('dimmed');
    });

    it('WHEN another task is the target THEN the package box of the group is dimmed', () => {
      tasks.paint('api#build');

      expect(probeStateOf(cy.getElementById('pkg:web'))).toBe('dimmed');
    });

    it('WHEN a task is the target THEN a file takes no state class', () => {
      tasks.paint('web#e2e-ci');

      expect(cy.getElementById(SPACED).hasClass('selected')).toBe(false);
    });
  });

  describe('GIVEN a sibling of the umbrella in its package is selected', () => {
    beforeEach(() => {
      tasks.show(SIBLING_DRAWING);
      tasks.paint('web#build');
    });

    it('WHEN the group expands and the canvas is marked again THEN its box is dimmed with the umbrella inside', () => {
      atoms.expand(SPEC, 'pkg:web', FILES, {});
      tasks.remark();

      expect(probeStateOf(cy.getElementById('atom:web#e2e-ci'))).toBe('dimmed');
      expect(probeStateOf(cy.getElementById('pkg:web'))).not.toBe('dimmed');
    });
  });
});
