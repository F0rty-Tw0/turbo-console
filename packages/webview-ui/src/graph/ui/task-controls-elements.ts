import {
  checkbox,
  controlsSection,
  field,
  groupingField,
  hintedField,
  scopeField,
  scriptsField,
  searchInput
} from './controls-fields.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import {
  DEFAULT_TASK_DEPTH,
  DEPENDENTS_DEPTH_HINT,
  DEPENDENTS_DEPTH_HINT_ID,
  DEPENDENTS_DEPTH_LABEL,
  MAX_TASK_DEPTH,
  MIN_TASK_DEPTH,
  NO_NAMES,
  SEARCH_TASKS_LABEL,
  TASK_CONTROLS_ID
} from '../common/graph-task.const.ts';
import { SEARCH_SECTION_TITLE, VIEW_SECTION_TITLE } from '../common/graph.const.ts';
import type { TaskControlsElements, TaskControlsRow } from '../common/task-controls.type.ts';
import { ownerTextOf } from '../utils/owner-text.util.ts';

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
const taskPick = (task: GraphTask, rootLabel: string | null): HTMLButtonElement => {
  const pick = textElement('button', 'controls-name', '');
  const name = textElement('span', 'controls-task-name', task.name);
  const description = textElement('span', 'controls-task-package', ownerTextOf(task.packageName, rootLabel, NO_NAMES));

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
export const buildTaskRow = (task: GraphTask, rootLabel: string | null): TaskControlsRow => {
  const pick = taskPick(task, rootLabel);
  const cell = textElement('div', 'controls-cell', '');
  const line = textElement('div', 'controls-row', '');

  cell.setAttribute('role', 'gridcell');
  cell.append(pick);
  line.setAttribute('role', 'row');
  line.append(cell);

  const row: TaskControlsRow = { task, line, pick };

  return row;
};

/**
 * The task Controls panel `aside#graph-task-controls`, hidden and unwired: the Search section, the View section (Dependents
 * depth, Group by folder, Show package scopes, Show scripts), then the task grid. Show scripts starts hidden: only the
 * task listing tells whether there is a script to show.
 */
export const buildTaskControls = (): TaskControlsElements => {
  const search = searchInput();
  const depth = taskDepthInput();
  const grouping = checkbox('controls-check');
  const scope = checkbox('controls-check');
  const scripts = checkbox('controls-check');
  const depthField = hintedField(DEPENDENTS_DEPTH_LABEL, depth, DEPENDENTS_DEPTH_HINT, DEPENDENTS_DEPTH_HINT_ID);
  const groupField = groupingField(grouping);
  const scriptsLine = scriptsField(scripts);
  const searchSection = controlsSection(SEARCH_SECTION_TITLE, field(SEARCH_TASKS_LABEL, search));
  const viewSection = controlsSection(VIEW_SECTION_TITLE, depthField, groupField, scopeField(scope), scriptsLine);
  const list = textElement('div', 'controls-list', '');
  const panel = textElement('aside', 'graph-controls graph-task-controls', '');

  search.setAttribute('aria-label', SEARCH_TASKS_LABEL);
  list.setAttribute('role', 'grid');
  scriptsLine.hidden = true;
  panel.id = TASK_CONTROLS_ID;
  panel.hidden = true;
  panel.append(searchSection, viewSection, list);

  const elements: TaskControlsElements = {
    panel,
    search,
    depth,
    grouping,
    scope,
    scripts,
    groupingField: groupField,
    scriptsField: scriptsLine,
    list
  };

  return elements;
};
