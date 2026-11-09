import type { Core, EdgeCollection, EdgeSingular, ElementDefinition, NodeCollection, NodeSingular } from 'cytoscape';

import { labelOf, setCountLabels, taskClassesOf } from './graph-atom-view.ts';
import { setClassesAmong } from './graph-classes.ts';
import { positionOf } from './graph-place.ts';
import { applyRoutes } from './graph-routes.ts';
import { boxesOf } from './graph-task-boxes.ts';
import { applyBoxFrames, refitBoxFrames } from './graph-task-frames.ts';
import { RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphEdge, GraphRunState, GraphTask, Position, Positions, Routes } from '../../bridge/common/graph-state.type.ts';
import type { Closure } from '../common/closure.type.ts';
import { ATOM_FILE_CLASS } from '../common/graph-atom.const.ts';
import { TASK_LINK_CLASS, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import { BOX_STATE_CLASS_NAMES, DIMMED_BOX_CLASS, STATE_CLASS_NAMES } from '../common/graph.const.ts';
import type { TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import type { TaskRuns } from '../common/task-details.type.ts';
import { closureOf } from '../utils/closure.util.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { taskEdgesOf } from '../utils/elk-task-graph.util.ts';
import { edgeStateOf, nodeStateOf } from '../utils/highlight.util.ts';
import { runClassOf } from '../utils/package-run.util.ts';
import { parentIdOf } from '../utils/task-compound.util.ts';
import { runStateOf } from '../utils/task-run.util.ts';

const RUN_CLASS_NAMES: string[] = RUN_STATES.map(runClassOf);

const NO_CLASSES: string[] = [];

const runClassesOf = (state: GraphRunState | null): string[] => {
  if (state === null) return NO_CLASSES;

  const name = runClassOf(state);

  return [name];
};

const DIMMED_BOX_CLASSES: string[] = [DIMMED_BOX_CLASS];

const taskNodes = (cy: Core): NodeCollection => cy.nodes(`.${TASK_NODE_CLASS}`);

const runNodes = (cy: Core): NodeCollection => cy.nodes(`.${TASK_NODE_CLASS}, .${ATOM_FILE_CLASS}`);

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
 * Gives each task and link one state class for `target`, the selected task, and its closure; a folder, package or
 * Scripts compound with no selected or highlighted task gets `dimmed-box`. `null` paints every task and link `normal`.
 * An element already right is not touched.
 */
const paintTasks = (cy: Core, target: string | null): void => {
  const tasks = taskNodes(cy);
  const links: EdgeCollection = tasks.connectedEdges();
  const closure = closureOfLinks(target, links);
  const classTask = (node: NodeSingular): void => {
    const state = nodeStateOf(node.id(), target, closure);

    setClassesAmong(node, STATE_CLASS_NAMES, [state]);
  };
  const classLink = (edge: EdgeSingular): void => {
    const ends = endsOf(edge);
    const state = edgeStateOf(ends, target, closure);

    setClassesAmong(edge, STATE_CLASS_NAMES, [state]);
  };
  const classBox = (box: NodeSingular): void => {
    const lit = box.descendants('.selected, .highlighted');
    const isUnlit = lit.empty();
    const isDimmed = target !== null && isUnlit;
    const wanted = isDimmed ? DIMMED_BOX_CLASSES : NO_CLASSES;

    setClassesAmong(box, BOX_STATE_CLASS_NAMES, wanted);
  };

  cy.batch((): void => {
    tasks.forEach(classTask);
    links.forEach(classLink);
    tasks.ancestors().forEach(classBox);
  });
};

/** One `run-<state>` class per task and Atomizer file in `runs`, none on the rest; a node already right is not touched. */
const markRuns = (cy: Core, runs: TaskRuns): void => {
  const markTask = (node: NodeSingular): void => {
    const state = runStateOf(runs, node.id());
    const wanted = runClassesOf(state);

    setClassesAmong(node, RUN_CLASS_NAMES, wanted);
  };

  cy.batch((): void => void runNodes(cy).forEach(markTask));
};

const taskDefinitionOf = (task: GraphTask, drawing: TaskDrawing): ElementDefinition => {
  const { width, height } = drawing.sizes.get(task.id) ?? drawing.sizeOf(task.name);
  const label = labelOf(task.name, drawing.labels.get(task.id));
  const parent = parentIdOf(task);
  const data = { id: task.id, name: task.name, label, parent, width, height };
  const position = positionOf(drawing.positions, task.id);
  const classes = taskClassesOf(drawing.sizes.has(task.id));
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
  const boxes = boxesOf(drawing);
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
    applyBoxFrames(cy, drawing.boxFrames);
    applyRoutes(cy, drawing.routes);
    paintTasks(cy, target);
    markRuns(cy, runs);
    refitBoxFrames(cy);
  };
  const paint = (next: string | null): void => {
    target = next;
    paintTasks(cy, next);
    refitBoxFrames(cy);
  };
  const runStates = (next: TaskRuns): void => {
    runs = next;
    markRuns(cy, next);
    refitBoxFrames(cy);
  };
  const setPositions = (positions: Positions): void => {
    const placeNode = (node: NodeSingular): Position => positionOf(positions, node.id());

    taskNodes(cy).positions(placeNode);
  };
  const setRoutes = (routes: Routes): void => applyRoutes(cy, routes);
  const positions = (): Positions => {
    const entries = taskNodes(cy).map(centreEntryOf);

    return Object.fromEntries(entries);
  };
  const clear = (): void => void cy.elements().remove();
  const setCounts = (labels: ReadonlyMap<string, string>): void => setCountLabels(cy, labels);
  const remark = (): void => {
    paintTasks(cy, target);
    markRuns(cy, runs);
    refitBoxFrames(cy);
  };
  const canvas: TaskCanvas = { show, clear, setPositions, setRoutes, positions, paint, runStates, setCounts, remark };

  return canvas;
};
