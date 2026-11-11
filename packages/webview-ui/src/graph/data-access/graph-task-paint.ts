import type { Core, EdgeCollection, EdgeSingular, NodeSingular } from 'cytoscape';

import { setClassesAmong } from './graph-classes.ts';
import { taskNodes } from './graph-task-marks.ts';
import type { GraphEdge } from '../../bridge/common/graph-state.type.ts';
import type { Closure } from '../common/closure.type.ts';
import { NO_CLASSES } from '../common/graph-task.const.ts';
import { BOX_STATE_CLASS_NAMES, DIMMED_BOX_CLASS, STATE_CLASS_NAMES } from '../common/graph.const.ts';
import { closureOf } from '../utils/closure.util.ts';
import { edgeStateOf, nodeStateOf } from '../utils/highlight.util.ts';

const DIMMED_BOX_CLASSES: string[] = [DIMMED_BOX_CLASS];

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
export const paintTasks = (cy: Core, target: string | null): void => {
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
