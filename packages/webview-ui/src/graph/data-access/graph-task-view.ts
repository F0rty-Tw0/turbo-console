import type { Core, ElementDefinition, NodeSingular } from 'cytoscape';

import { setCountLabels, taskClassesOf } from './graph-atom-view.ts';
import { positionOf } from './graph-place.ts';
import { boxesOf } from './graph-task-boxes.ts';
import { applyBoxFrames, refitBoxFrames } from './graph-task-frames.ts';
import { markAffected, markPredictions, markRuns, taskNodes } from './graph-task-marks.ts';
import { paintTasks } from './graph-task-paint.ts';
import type { GraphAtomCounts } from '../../bridge/common/graph-message.type.ts';
import type { GraphEdge, GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { atomCountsText } from '../../bridge/utils/atom-counts-text.util.ts';
import { NO_AFFECTED, NO_PREDICTIONS, TASK_LINK_CLASS } from '../common/graph-task.const.ts';
import type { TaskAffectedMarks, TaskCanvas, TaskDrawing, TaskPredictions } from '../common/task-canvas.type.ts';
import type { TaskRuns } from '../common/task-details.type.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { taskEdgesOf } from '../utils/elk-task-graph.util.ts';
import { parentIdOf } from '../utils/task-compound.util.ts';

/** An umbrella's counts text as node data; a task with no counts adds none. */
const countsDataOf = (counts: GraphAtomCounts | undefined): Record<string, string> => {
  const none: Record<string, string> = {};

  if (counts === undefined) return none;

  const data = { countsText: atomCountsText(counts) };

  return data;
};

const taskDefinitionOf = (task: GraphTask, drawing: TaskDrawing): ElementDefinition => {
  const { width, height } = drawing.sizes.get(task.id) ?? drawing.sizeOf(task.name);
  const countsData = countsDataOf(drawing.labels.get(task.id));
  const parent = parentIdOf(task);
  const data = { id: task.id, name: task.name, label: task.name, ...countsData, parent, width, height };
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

const centresOf = (cy: Core): Positions => {
  const entries = taskNodes(cy).map(centreEntryOf);

  return Object.fromEntries(entries);
};

/** Replaces every element with the drawn tasks, their box frames and their links, drawn straight; marks and paint come after. */
const drawTasks = (cy: Core, drawing: TaskDrawing): void => {
  const elements = elementsOf(drawing);

  cy.resize();
  cy.elements().remove();
  cy.add(elements);
  applyBoxFrames(cy, drawing.boxFrames);
};

const moveTasks = (cy: Core, positions: Positions): void => {
  const placeNode = (node: NodeSingular): Position => positionOf(positions, node.id());

  taskNodes(cy).positions(placeNode);
};

/**
 * The task graph on `cy`, the core the package graph shares; showing it removes the package graph. The last paint
 * target, runs map, predictions and affected marks are kept, so a task graph drawn again carries them.
 */
export const createTaskCanvas = (cy: Core): TaskCanvas => {
  let target: string | null = null;
  let runs: TaskRuns = {};
  let predicted: TaskPredictions = NO_PREDICTIONS;
  let marked: TaskAffectedMarks = NO_AFFECTED;
  const remark = (): void => {
    paintTasks(cy, target);
    markRuns(cy, runs);
    markPredictions(cy, predicted);
    markAffected(cy, marked);
    refitBoxFrames(cy);
  };
  const show = (drawing: TaskDrawing): void => {
    drawTasks(cy, drawing);
    remark();
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
  const predictions = (next: TaskPredictions | null): void => {
    if (next === null || next === predicted) return;

    predicted = next;

    const isChanged = markPredictions(cy, next);

    if (isChanged) refitBoxFrames(cy);
  };
  const affected = (next: TaskAffectedMarks): void => {
    if (next === marked) return;

    marked = next;
    markAffected(cy, next);
  };
  const setPositions = (positions: Positions): void => moveTasks(cy, positions);
  const positions = (): Positions => centresOf(cy);
  const clear = (): void => void cy.elements().remove();
  const setCounts = (labels: ReadonlyMap<string, GraphAtomCounts>): void => setCountLabels(cy, labels);
  const marks = { paint, runStates, predictions, affected, remark };
  const canvas: TaskCanvas = { show, clear, setPositions, positions, setCounts, ...marks };

  return canvas;
};
