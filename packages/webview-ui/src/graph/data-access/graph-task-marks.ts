import type { Core, NodeCollection, NodeSingular } from 'cytoscape';

import { setClassesAmong } from './graph-classes.ts';
import { PREDICTION_WORDS, RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import { ATOM_FILE_CLASS } from '../common/graph-atom.const.ts';
import { TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import type { TaskPredictions } from '../common/task-canvas.type.ts';
import type { TaskRuns } from '../common/task-details.type.ts';
import { runClassOf } from '../utils/package-run.util.ts';
import { predictionClassOf } from '../utils/prediction-class.util.ts';
import { runStateOf } from '../utils/task-run.util.ts';

const RUN_CLASS_NAMES: string[] = RUN_STATES.map(runClassOf);

const PREDICTION_CLASS_NAMES: string[] = PREDICTION_WORDS.map(predictionClassOf);

export const NO_CLASSES: string[] = [];

const runClassesOf = (state: GraphRunState | null): string[] => {
  if (state === null) return NO_CLASSES;

  const name = runClassOf(state);

  return [name];
};

/** The class of the task's word in `predicted`; an own key only, so `constructor` or `__proto__` never reads as a word. */
const predictionClassesOf = (predicted: TaskPredictions, id: string): string[] => {
  const hasWord = Object.hasOwn(predicted, id);
  const word = predicted[id];

  if (!hasWord || word === undefined) return NO_CLASSES;

  const name = predictionClassOf(word);

  return [name];
};

export const taskNodes = (cy: Core): NodeCollection => cy.nodes(`.${TASK_NODE_CLASS}`);

const runNodes = (cy: Core): NodeCollection => cy.nodes(`.${TASK_NODE_CLASS}, .${ATOM_FILE_CLASS}`);

/** One `run-<state>` class per task and Atomizer file in `runs`, none on the rest; a node already right is not touched. */
export const markRuns = (cy: Core, runs: TaskRuns): void => {
  const markTask = (node: NodeSingular): void => {
    const state = runStateOf(runs, node.id());
    const wanted = runClassesOf(state);

    setClassesAmong(node, RUN_CLASS_NAMES, wanted);
  };

  cy.batch((): void => void runNodes(cy).forEach(markTask));
};

/** One `predict-<word>` class per task node in `predicted`, none on the rest; a node already right is not touched. */
export const markPredictions = (cy: Core, predicted: TaskPredictions): void => {
  const markTask = (node: NodeSingular): void => {
    const wanted = predictionClassesOf(predicted, node.id());

    setClassesAmong(node, PREDICTION_CLASS_NAMES, wanted);
  };

  cy.batch((): void => void taskNodes(cy).forEach(markTask));
};
