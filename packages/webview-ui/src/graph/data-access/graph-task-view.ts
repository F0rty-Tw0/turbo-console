import type { Core, EdgeCollection, EdgeSingular, ElementDefinition, NodeCollection, NodeSingular } from 'cytoscape';

import { positionOf } from './graph-place.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphEdge, GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { Closure } from '../common/closure.type.ts';
import { ATOM_UMBRELLA_CLASS } from '../common/graph-atom.const.ts';
import { RUN_CLASS_PREFIX, TASK_BOX_CLASS, TASK_LINK_CLASS, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import { DIMMED_BOX_CLASS, STATE_CLASSES } from '../common/graph.const.ts';
import type { TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import type { TaskRuns } from '../common/task-details.type.ts';
import { closureOf } from '../utils/closure.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { taskBoxIdOf, taskEdgesOf } from '../utils/elk-task-graph.util.ts';
import { edgeStateOf, nodeStateOf } from '../utils/highlight.util.ts';
import { runStateOf } from '../utils/task-run.util.ts';

const RUN_CLASSES = RUN_STATES.map((state) => `${RUN_CLASS_PREFIX}${state}`).join(' ');

const BOX_STATE_CLASSES = `${STATE_CLASSES} ${DIMMED_BOX_CLASS}`;

const taskNodes = (cy: Core): NodeCollection => cy.nodes(`.${TASK_NODE_CLASS}`);

const endsOf = (edge: EdgeSingular): GraphEdge => {
  const source = edge.source().id();
  const target = edge.target().id();
  const ends: GraphEdge = { source, target };

  return ends;
};

const closureOfLinks = (target: string | null, links: EdgeCollection): Closure | null => {
  if (target === null) return null;

  const edges = links.map(endsOf);

  return closureOf(target, edges);
};

/**
 * Gives each task and link one state class for `target`, the selected task, and its closure; a package compound with
 * no selected or highlighted task gets `dimmed-box`. `null` paints every task and link `normal`.
 */
const paintTasks = (cy: Core, target: string | null): void => {
  const tasks = taskNodes(cy);
  const links: EdgeCollection = tasks.connectedEdges();
  const closure = closureOfLinks(target, links);
  const classTask = (node: NodeSingular): void => {
    const state = nodeStateOf(node.id(), target, closure);

    node.removeClass(STATE_CLASSES).addClass(state);
  };
  const classLink = (edge: EdgeSingular): void => {
    const ends = endsOf(edge);
    const state = edgeStateOf(ends, target, closure);

    edge.removeClass(STATE_CLASSES).addClass(state);
  };
  const classBox = (box: NodeSingular): void => {
    const lit = box.children('.selected, .highlighted');
    const isUnlit = lit.empty();
    const isDimmed = target !== null && isUnlit;

    box.removeClass(BOX_STATE_CLASSES);

    if (isDimmed) box.addClass(DIMMED_BOX_CLASS);
  };

  cy.batch((): void => {
    tasks.forEach(classTask);
    links.forEach(classLink);
    tasks.parent().forEach(classBox);
  });
};

/** One `run-<state>` class per task in `runs`, none on the rest. */
const markRuns = (cy: Core, runs: TaskRuns): void => {
  const markTask = (node: NodeSingular): void => {
    const state = runStateOf(runs, node.id());

    node.removeClass(RUN_CLASSES);

    if (state !== null) node.addClass(`${RUN_CLASS_PREFIX}${state}`);
  };

  cy.batch((): void => {
    taskNodes(cy).forEach(markTask);
  });
};

const boxDefinitionOf = (packageName: string): ElementDefinition => {
  const data = { id: taskBoxIdOf(packageName), title: packageName };
  const definition: ElementDefinition = { data, classes: TASK_BOX_CLASS };

  return definition;
};

const labelOf = (name: string, counts: string | undefined): string => (counts === undefined ? name : `${name}\n${counts}`);

const taskDefinitionOf = (task: GraphTask, drawing: TaskDrawing): ElementDefinition => {
  const { width, height } = drawing.sizes.get(task.id) ?? drawing.sizeOf(task.name);
  const label = labelOf(task.name, drawing.labels.get(task.id));
  const parent = taskBoxIdOf(task.packageName);
  const data = { id: task.id, name: task.name, label, parent, width, height };
  const position = positionOf(drawing.positions, task.id);
  const isUmbrella = drawing.sizes.has(task.id);
  const classes = isUmbrella ? `${TASK_NODE_CLASS} ${ATOM_UMBRELLA_CLASS}` : TASK_NODE_CLASS;
  const definition: ElementDefinition = { data, position, classes };

  return definition;
};

const edgeDefinitionOf = (edge: GraphEdge): ElementDefinition => {
  const data = { id: edgeIdOf(edge), source: edge.source, target: edge.target };
  const definition: ElementDefinition = { data, classes: TASK_LINK_CLASS };

  return definition;
};

/** The compounds first, so each task's parent exists as it is added. */
const elementsOf = (drawing: TaskDrawing): ElementDefinition[] => {
  const { tasks } = drawing;
  const ids = new Set(tasks.map((task) => task.id));
  const packages = new Set(tasks.map((task) => task.packageName));
  const names = [...packages];
  const boxes = names.map(boxDefinitionOf);
  const nodes = tasks.map((task) => taskDefinitionOf(task, drawing));
  const edges = taskEdgesOf(tasks, ids);
  const links = edges.map(edgeDefinitionOf);

  return [...boxes, ...nodes, ...links];
};

const centreEntryOf = (node: NodeSingular): [string, Position] => {
  const { x, y } = node.position();
  const centre: Position = { x, y };

  return [node.id(), centre];
};

/**
 * The task graph on `cy`, the core the package graph shares; showing it removes the package graph. The last paint
 * target and runs map are kept, so a task graph drawn again carries them.
 */
export const createTaskCanvas = (cy: Core): TaskCanvas => {
  let target: string | null = null;
  let runs: TaskRuns = {};
  const show = (drawing: TaskDrawing): void => {
    const elements = elementsOf(drawing);

    cy.resize();
    cy.elements().remove();
    cy.add(elements);
    paintTasks(cy, target);
    markRuns(cy, runs);
  };
  const paint = (next: string | null): void => {
    target = next;
    paintTasks(cy, next);
  };
  const runStates = (next: TaskRuns): void => {
    runs = next;
    markRuns(cy, next);
  };
  const setPositions = (positions: Positions): void => {
    const placeNode = (node: NodeSingular): Position => positionOf(positions, node.id());

    taskNodes(cy).positions(placeNode);
  };
  const positions = (): Positions => {
    const entries = taskNodes(cy).map(centreEntryOf);

    return Object.fromEntries(entries);
  };
  const clear = (): void => void cy.elements().remove();
  const setCounts = (labels: ReadonlyMap<string, string>): void => {
    const countNode = (counts: string, id: string): void => {
      const node = cy.getElementById(id);
      const name: unknown = node.data('name');

      node.data('label', labelOf(String(name), counts));
    };

    cy.batch((): void => labels.forEach(countNode));
  };
  const canvas: TaskCanvas = { show, clear, setPositions, positions, paint, runStates, setCounts };

  return canvas;
};
