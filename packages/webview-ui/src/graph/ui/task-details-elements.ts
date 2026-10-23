import { actionButton, lineOf, sectionOf } from './details-parts.ts';
import { graphIcon } from './graph-icon.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import {
  DEPENDENCIES_LABEL,
  NO_COMMAND_TEXT,
  RUN_LABEL,
  RUN_NO_CACHE_LABEL,
  RUN_STATE_ICONS,
  RUN_STATE_TEXT,
  STOP_LABEL,
  TASK_DETAILS_ID
} from '../common/graph-task.const.ts';
import { DETAILS_LABEL } from '../common/graph.const.ts';
import type { TaskDependencyButton, TaskDetailsModel, TaskDetailsView } from '../common/task-details.type.ts';

/** A button whose `data-focus` key names its twin in the next view built. */
const focusButton = (button: HTMLButtonElement, key: string): HTMLButtonElement => {
  button.setAttribute('data-focus', key);

  return button;
};

/** The run state as icon + word; `data-state` picks the icon colour, and no state hides the line. */
const stateLine = (state: GraphRunState | null): HTMLElement => {
  const text = state === null ? '' : RUN_STATE_TEXT[state];
  const line = textElement('p', 'details-line task-run-state', text);

  line.hidden = state === null;

  if (state === null) return line;

  const icon = graphIcon(RUN_STATE_ICONS[state]);

  line.setAttribute('data-state', state);
  line.prepend(icon);

  return line;
};

const dependencyButton = (task: GraphTask): TaskDependencyButton => {
  const named = textElement('button', 'details-name', task.id);
  const button = focusButton(named, `dep:${task.id}`);

  button.type = 'button';
  button.title = task.id;

  const dependency: TaskDependencyButton = { task, button };

  return dependency;
};

/** The empty, hidden task side panel; `GraphTaskDetails` fills it with one view at a time. */
export const buildTaskDetailsPanel = (): HTMLElement => {
  const panel = textElement('aside', 'graph-details graph-task-details', '');

  panel.id = TASK_DETAILS_ID;
  panel.hidden = true;
  panel.setAttribute('aria-label', DETAILS_LABEL);

  return panel;
};

const dependencySection = (dependencies: TaskDependencyButton[]): HTMLElement => {
  const section = sectionOf();
  const heading = textElement('h3', 'details-subheading', DEPENDENCIES_LABEL);
  const buttons = dependencies.map((dependency) => dependency.button);

  section.hidden = dependencies.length === 0;
  section.append(heading, ...buttons);

  return section;
};

/**
 * The selected task's view: name, package, command (as text only), run state, run buttons and dependency buttons. Run
 * and Run without cache show only for a runnable task, Stop only while it runs.
 */
export const buildTaskDetails = (model: TaskDetailsModel): TaskDetailsView => {
  const { task } = model;
  const root = textElement('section', 'details-view', '');
  const heading = textElement('h2', 'details-heading', task.name);
  const main = sectionOf();
  const owner = lineOf(task.packageName);
  const command = textElement('code', 'details-code', task.command ?? NO_COMMAND_TEXT);
  const state = stateLine(model.state);
  const actions = textElement('div', 'details-actions', '');
  const run = focusButton(actionButton(RUN_LABEL), 'run');
  const runNoCache = focusButton(actionButton(RUN_NO_CACHE_LABEL), 'runNoCache');
  const stop = focusButton(actionButton(STOP_LABEL), 'stop');
  const dependencies = model.dependencies.map(dependencyButton);
  const needs = dependencySection(dependencies);

  heading.tabIndex = -1;
  run.hidden = !task.isRunnable;
  runNoCache.hidden = !task.isRunnable;
  stop.hidden = model.state !== 'running';
  actions.append(run, runNoCache, stop);
  main.append(owner, command, state, actions);
  root.append(heading, main, needs);

  const view: TaskDetailsView = { root, heading, command, state, dependencies, run, runNoCache, stop };

  return view;
};
