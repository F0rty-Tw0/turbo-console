import { field, hintedField, searchInput } from './controls-fields.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import {
  DEFAULT_TASK_DEPTH,
  DEPENDENTS_DEPTH_HINT,
  DEPENDENTS_DEPTH_HINT_ID,
  DEPENDENTS_DEPTH_LABEL,
  MAX_TASK_DEPTH,
  MIN_TASK_DEPTH,
  SEARCH_TASKS_LABEL,
  TASK_CONTROLS_ID
} from '../common/graph-task.const.ts';
import type { TaskControlsElements, TaskControlsRow } from '../common/task-controls.type.ts';

const taskDepthInput = (): HTMLInputElement => {
  const depth = document.createElement('input');

  depth.type = 'number';
  depth.className = 'controls-input';
  depth.min = String(MIN_TASK_DEPTH);
  depth.max = String(MAX_TASK_DEPTH);
  depth.step = '1';
  depth.defaultValue = String(DEFAULT_TASK_DEPTH);
  depth.setAttribute('aria-label', DEPENDENTS_DEPTH_LABEL);

  return depth;
};

/**
 * The task's button: its name names it, and its package, hidden from the name, describes it. The `title` keeps the full
 * id when CSS cuts the name.
 */
const taskPick = (task: GraphTask): HTMLButtonElement => {
  const pick = textElement('button', 'controls-name', '');
  const name = textElement('span', 'controls-task-name', task.name);
  const description = textElement('span', 'controls-task-package', task.packageName);

  description.id = `${TASK_CONTROLS_ID}-${task.id}`;
  description.setAttribute('aria-hidden', 'true');
  pick.type = 'button';
  pick.tabIndex = -1;
  pick.title = task.id;
  pick.setAttribute('aria-describedby', description.id);
  pick.append(name, description);

  return pick;
};

/** One task list row: a grid row of one cell holding the task's button, out of the Tab order. */
export const buildTaskRow = (task: GraphTask): TaskControlsRow => {
  const pick = taskPick(task);
  const cell = textElement('div', 'controls-cell', '');
  const line = textElement('div', 'controls-row', '');

  cell.setAttribute('role', 'gridcell');
  cell.append(pick);
  line.setAttribute('role', 'row');
  line.append(cell);

  const row: TaskControlsRow = { task, line, pick };

  return row;
};

/** The task Controls panel `aside#graph-task-controls`, hidden and unwired: Search tasks, Dependents depth, then the task grid. */
export const buildTaskControls = (): TaskControlsElements => {
  const search = searchInput();
  const depth = taskDepthInput();
  const depthField = hintedField(DEPENDENTS_DEPTH_LABEL, depth, DEPENDENTS_DEPTH_HINT, DEPENDENTS_DEPTH_HINT_ID);
  const list = textElement('div', 'controls-list', '');
  const panel = textElement('aside', 'graph-controls graph-task-controls', '');

  search.setAttribute('aria-label', SEARCH_TASKS_LABEL);
  list.setAttribute('role', 'grid');
  panel.id = TASK_CONTROLS_ID;
  panel.hidden = true;
  panel.append(field(SEARCH_TASKS_LABEL, search), depthField, list);

  const elements: TaskControlsElements = { panel, search, depth, list };

  return elements;
};
