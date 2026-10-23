import type { Core, ElementDefinition, NodeCollection, NodeSingular } from 'cytoscape';

import { positionOf } from './graph-place.ts';
import type { GraphEdge, GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import type { TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { taskBoxIdOf, taskEdgesOf } from '../utils/elk-task-graph.util.ts';

const taskNodes = (cy: Core): NodeCollection => cy.nodes(`.${TASK_NODE_CLASS}`);

const boxDefinitionOf = (packageName: string): ElementDefinition => {
  const data = { id: taskBoxIdOf(packageName), title: packageName };
  const definition: ElementDefinition = { data };

  return definition;
};

const taskDefinitionOf = (task: GraphTask, drawing: TaskDrawing): ElementDefinition => {
  const { width, height } = drawing.sizeOf(task.name);
  const data = { id: task.id, label: task.name, parent: taskBoxIdOf(task.packageName), width, height };
  const position = positionOf(drawing.positions, task.id);
  const definition: ElementDefinition = { data, position, classes: TASK_NODE_CLASS };

  return definition;
};

const edgeDefinitionOf = (edge: GraphEdge): ElementDefinition => {
  const data = { id: edgeIdOf(edge), source: edge.source, target: edge.target };
  const definition: ElementDefinition = { data };

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

/** The task graph on `cy`, the core the package graph shares; showing it removes the package graph. */
export const createTaskCanvas = (cy: Core): TaskCanvas => {
  const show = (drawing: TaskDrawing): void => {
    const elements = elementsOf(drawing);

    cy.resize();
    cy.elements().remove();
    cy.add(elements);
  };
  const setPositions = (positions: Positions): void => {
    const placeNode = (node: NodeSingular): Position => positionOf(positions, node.id());

    taskNodes(cy).positions(placeNode);
  };
  const positions = (): Positions => {
    const entries = taskNodes(cy).map(centreEntryOf);

    return Object.fromEntries(entries);
  };
  const canvas: TaskCanvas = { show, clear: (): void => void cy.elements().remove(), setPositions, positions };

  return canvas;
};
