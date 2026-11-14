import type { Core, NodeCollection, NodeSingular } from 'cytoscape';

import { setClassesAmong } from './graph-classes.ts';
import { AFFECTED_MARKS, PREDICTION_WORDS, RUN_STATES } from '../../bridge/common/graph-message.const.ts';
import type { GraphRunState } from '../../bridge/common/graph-state.type.ts';
import { ATOM_FILE_CLASS } from '../common/graph-atom.const.ts';
import { CARD_CLOCK_DATA, TASK_CARD_CLASS } from '../common/graph-card.const.ts';
import { NO_CLASSES, TASK_NODE_CLASS } from '../common/graph-task.const.ts';
import type { TaskAffectedMarks, TaskClocks, TaskPredictions } from '../common/task-canvas.type.ts';
import type { TaskRuns } from '../common/task-details.type.ts';
import { affectedClassOf } from '../utils/affected-class.util.ts';
import { runClassOf } from '../utils/package-run.util.ts';
import { predictionClassOf } from '../utils/prediction-class.util.ts';
import { runStateOf } from '../utils/task-run.util.ts';

const RUN_CLASS_NAMES: string[] = RUN_STATES.map(runClassOf);

const PREDICTION_CLASS_NAMES: string[] = PREDICTION_WORDS.map(predictionClassOf);

const AFFECTED_CLASS_NAMES: string[] = AFFECTED_MARKS.map(affectedClassOf);

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

/** The class of the task's mark in `marked`; an own key only, so `constructor` or `__proto__` never reads as a mark. */
const affectedClassesOf = (marked: TaskAffectedMarks, id: string): string[] => {
  const hasMark = Object.hasOwn(marked, id);
  const mark = marked[id];

  if (!hasMark || mark === undefined) return NO_CLASSES;

  const name = affectedClassOf(mark);

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

/**
 * One `predict-<word>` class per task node in `predicted`, none on the rest; a node already right is not touched.
 * Answers whether any node's classes changed.
 */
export const markPredictions = (cy: Core, predicted: TaskPredictions): boolean => {
  let isChanged = false;
  const markTask = (node: NodeSingular): void => {
    const wanted = predictionClassesOf(predicted, node.id());
    const isWritten = setClassesAmong(node, PREDICTION_CLASS_NAMES, wanted);

    isChanged ||= isWritten;
  };

  cy.batch((): void => void taskNodes(cy).forEach(markTask));

  return isChanged;
};

/** One `affected-<mark>` class per task node in `marked`, none on the rest; a node already right is not touched. */
export const markAffected = (cy: Core, marked: TaskAffectedMarks): void => {
  const markTask = (node: NodeSingular): void => {
    const wanted = affectedClassesOf(marked, node.id());

    setClassesAmong(node, AFFECTED_CLASS_NAMES, wanted);
  };

  cy.batch((): void => void taskNodes(cy).forEach(markTask));
};

/** The card's text in `clocks`; an own key only, so `constructor` or `__proto__` never reads as a clock. */
const clockOf = (clocks: TaskClocks, id: string): string | undefined => {
  const hasClock = Object.hasOwn(clocks, id);

  if (!hasClock) return undefined;

  return clocks[id];
};

/** The `clock` data of each plain card in `clocks`, none on the rest; a card already right is not touched. */
export const markClocks = (cy: Core, clocks: TaskClocks): void => {
  const markCard = (node: NodeSingular): void => {
    const wanted = clockOf(clocks, node.id());
    const stored: unknown = node.data(CARD_CLOCK_DATA);

    if (wanted === stored) return;

    // the object form: `removeData` clears the key too but never re-runs the style mappers, so the label kept the clock
    const next = { [CARD_CLOCK_DATA]: wanted };

    node.data(next);
  };

  cy.batch((): void => void cy.nodes(`.${TASK_CARD_CLASS}`).forEach(markCard));
};
