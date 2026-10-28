import { buildDetailsContent } from './details-elements.ts';
import { actionButton, leadOf, lineOf, sectionOf } from './details-parts.ts';
import { graphIcon } from './graph-icon.ts';
import type { GraphRunState, GraphTask } from '../../bridge/common/graph-state.type.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { DetailsElements } from '../common/details-view.type.ts';
import {
  DEPENDENCIES_LABEL,
  DEPENDENTS_LABEL,
  NONE_SHOWN_TEXT,
  NO_COMMAND_TEXT,
  ROOT_TASK_PACKAGE,
  RUN_LABEL,
  RUN_NO_CACHE_LABEL,
  RUN_STATE_ICONS,
  RUN_STATE_TEXT,
  STOP_LABEL,
  TASK_DETAILS_ID,
  TASK_EMPTY_LEAD_TEXT
} from '../common/graph-task.const.ts';
import { DETAILS_LABEL } from '../common/graph.const.ts';
import type { TaskDependencyButton, TaskDetailsEmpty, TaskDetailsModel, TaskDetailsView } from '../common/task-details.type.ts';
import { showPackageLabelOf } from '../utils/controls-text.util.ts';
import { ownerTextOf } from '../utils/owner-text.util.ts';
import { isLiveRun } from '../utils/task-run.util.ts';

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

/** A task named by its id; its focus key is `kind:<id>`, `dep` in Dependencies and `dependent` in Dependents. */
const dependencyButton = (task: GraphTask, kind: string): TaskDependencyButton => {
  const named = textElement('button', 'details-name', task.id);
  const button = focusButton(named, `${kind}:${task.id}`);

  button.type = 'button';
  button.title = task.id;

  const dependency: TaskDependencyButton = { task, button };

  return dependency;
};

/** The hidden task side panel and its empty content, as `buildDetails`; `GraphTaskDetails` fills the content with one view at a time. */
export const buildTaskDetailsPanel = (): DetailsElements => {
  const panel = textElement('aside', 'graph-details graph-task-details', '');
  const content = buildDetailsContent();

  panel.id = TASK_DETAILS_ID;
  panel.hidden = true;
  panel.setAttribute('aria-label', DETAILS_LABEL);
  panel.append(content);

  const elements: DetailsElements = { panel, content };

  return elements;
};

/** What the task side panel shows with no task selected: the Details heading and what selecting a task shows here. */
export const buildTaskDetailsEmpty = (): TaskDetailsEmpty => {
  const root = textElement('section', 'details-view', '');
  const row = textElement('div', 'details-title', '');
  const heading = textElement('h2', 'details-heading', DETAILS_LABEL);
  const lead = leadOf(TASK_EMPTY_LEAD_TEXT);

  heading.tabIndex = -1;
  row.append(heading);
  root.append(row, lead);

  const empty: TaskDetailsEmpty = { root, heading };

  return empty;
};

/** A section of task buttons under `label`. */
const dependencySection = (label: string, dependencies: TaskDependencyButton[]): HTMLElement => {
  const section = sectionOf();
  const heading = textElement('h3', 'details-subheading', label);
  const buttons = dependencies.map((dependency) => dependency.button);

  section.append(heading, ...buttons);

  return section;
};

/** The Dependents section, shown always: its buttons, or `NONE_SHOWN_TEXT` while no shown task depends on the task. */
const dependentsSection = (dependents: TaskDependencyButton[]): HTMLElement => {
  const section = dependencySection(DEPENDENTS_LABEL, dependents);

  if (dependents.length === 0) section.append(lineOf(NONE_SHOWN_TEXT));

  return section;
};

/** The package name as a link-style button named and titled Show package, which shows it in the package graph. */
const ownerButton = (packageName: string): HTMLButtonElement => {
  const label = showPackageLabelOf(packageName);
  const named = textElement('button', 'details-name', packageName);
  const button = focusButton(named, 'owner');

  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);

  return button;
};

type OwnerLine = {
  readonly line: HTMLElement;
  readonly owner: HTMLButtonElement | null;
};

/** The owner line: a root task's plain owner text, any other task's owner button. */
const ownerLineOf = (model: TaskDetailsModel): OwnerLine => {
  const { packageName } = model.task;

  if (packageName === ROOT_TASK_PACKAGE) {
    const text = ownerTextOf(packageName, model.rootLabel);
    const textLine = lineOf(text);
    const plain: OwnerLine = { line: textLine, owner: null };

    return plain;
  }

  const line = lineOf('');
  const owner = ownerButton(packageName);
  const linked: OwnerLine = { line, owner };

  line.append(owner);

  return linked;
};

/**
 * The selected task's view: name, package (a Show package button but for a root task), command (as text only), run
 * state, run buttons, dependency buttons and dependent buttons. Run and Run without cache show only for a runnable task,
 * Stop only while it runs; Dependencies hides while empty, and Dependents says none is shown.
 */
export const buildTaskDetails = (model: TaskDetailsModel): TaskDetailsView => {
  const { task } = model;
  const root = textElement('section', 'details-view', '');
  const heading = textElement('h2', 'details-heading', task.name);
  const main = sectionOf();
  const { line: ownerLine, owner } = ownerLineOf(model);
  const command = textElement('code', 'details-code', task.command ?? NO_COMMAND_TEXT);
  const state = stateLine(model.state);
  const isLive = isLiveRun(model.state);
  const actions = textElement('div', 'details-actions', '');
  const run = focusButton(actionButton(RUN_LABEL), 'run');
  const runNoCache = focusButton(actionButton(RUN_NO_CACHE_LABEL), 'runNoCache');
  const stop = focusButton(actionButton(STOP_LABEL), 'stop');
  const dependencies = model.dependencies.map((dependency) => dependencyButton(dependency, 'dep'));
  const dependents = model.dependents.map((dependent) => dependencyButton(dependent, 'dependent'));
  const needs = dependencySection(DEPENDENCIES_LABEL, dependencies);
  const neededBy = dependentsSection(dependents);

  heading.tabIndex = -1;
  run.hidden = !task.isRunnable;
  runNoCache.hidden = !task.isRunnable;
  stop.hidden = !isLive;
  needs.hidden = dependencies.length === 0;
  actions.append(run, runNoCache, stop);
  main.append(ownerLine, command, state, actions);
  root.append(heading, main, needs, neededBy);

  const view: TaskDetailsView = { root, heading, command, state, dependencies, dependents, owner, run, runNoCache, stop };

  return view;
};
