import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, NodeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { GraphAtomGroup, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomGroupsDeps } from '../common/graph-atom.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskCanvas } from '../common/task-canvas.type.ts';
import { createAtomCanvas } from '../data-access/graph-atom-view.ts';
import { createTaskCanvas } from '../data-access/graph-task-view.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const UMBRELLA = 'web#e2e-ci';

const BOX_ID = `atom:${UMBRELLA}`;

const UMBRELLA_SIZE: NodeSize = { width: 160, height: 52 };

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const UMBRELLA_AT: Position = { x: 180, y: 126 };

const API_AT: Position = { x: 400, y: 126 };

const POSITIONS: Positions = { [UMBRELLA]: UMBRELLA_AT, 'api#build': API_AT };

const TASKS = [taskOf(UMBRELLA, []), taskOf('api#build', [])];

const SIZES = new Map([[UMBRELLA, UMBRELLA_SIZE]]);

const FILES = [{ id: `${UMBRELLA}--a.spec.ts`, specPath: 'a.spec.ts', isLive: false }];

const GROUP: GraphAtomGroup = { umbrellaId: UMBRELLA, files: FILES };

const BOX_TASK_DATA = { id: BOX_ID };

/** A task node that happens to have the id of the umbrella's box. */
const boxTaskOf = (): ElementDefinition => {
  const task: ElementDefinition = { data: BOX_TASK_DATA, classes: 'task' };

  return task;
};

const idOf = (node: NodeSingular): string => node.id();

const parentIdsOf = (cy: Core, id: string): string[] => {
  const parents = cy.getElementById(id).parent();

  return parents.map(idOf);
};

const positionsOf = (cy: Core): Positions => {
  const entryOf = (node: NodeSingular): [string, Position] => [node.id(), node.position()];
  const entries = cy.nodes().map(entryOf);

  return Object.fromEntries(entries);
};

describe('FEATURE: Atomizer groups on a canvas where a task is named like the box of an umbrella', () => {
  let cy: Core;
  let tasks: TaskCanvas;
  let groups: GraphAtomGroups;

  beforeEach(() => {
    const layout = { name: 'preset', fit: false };
    const drawing = { tasks: TASKS, positions: POSITIONS, sizeOf: (): NodeSize => NODE_SIZE, sizes: SIZES, labels: new Map() };

    cy = cytoscape({ headless: true, layout });
    tasks = createTaskCanvas(cy);
    tasks.show(drawing);
    cy.add(boxTaskOf());

    const view: AtomGroupsDeps['view'] = { tasks, atoms: createAtomCanvas(cy) };
    const bridge: AtomGroupsDeps['bridge'] = { post: vi.fn() };
    const deps: AtomGroupsDeps = { view, bridge, now: () => 0 };

    groups = new GraphAtomGroups(deps);
    groups.received([GROUP]);
    groups.placed(new Set([UMBRELLA]), POSITIONS, SIZES, TASKS);
  });

  afterEach(() => {
    cy.destroy();
  });

  it('WHEN that task is double tapped THEN the umbrella stays in its package box', () => {
    groups.toggle(BOX_ID);

    expect(parentIdsOf(cy, UMBRELLA)).toStrictEqual(['pkg:web']);
  });

  it('WHEN the umbrella is double tapped THEN nothing throws and the canvas still moves nodes', () => {
    const apiAt: Position = { x: 7, y: 8 };

    expect(() => groups.toggle(UMBRELLA)).not.toThrow();
    tasks.setPositions({ 'api#build': apiAt });

    expect(cy.getElementById('api#build').position()).toStrictEqual(apiAt);
  });

  it('WHEN the umbrella is double tapped THEN its refused group moves no node and leaves the canvas grabbable', () => {
    const positionsBefore = positionsOf(cy);

    groups.toggle(UMBRELLA);

    expect([positionsOf(cy), cy.autoungrabify()]).toStrictEqual([positionsBefore, false]);
  });

  it('WHEN the umbrella is double tapped twice THEN its refused group still moves no node and leaves the canvas grabbable', () => {
    const positionsBefore = positionsOf(cy);

    groups.toggle(UMBRELLA);
    groups.toggle(UMBRELLA);

    expect([positionsOf(cy), cy.autoungrabify()]).toStrictEqual([positionsBefore, false]);
  });
});
