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
import { PROJECTS_SECTION_TITLE, SEARCH_SECTION_TITLE, VIEW_SECTION_TITLE } from '../common/graph.const.ts';
import type { TaskControlsElements } from '../common/task-controls.type.ts';

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
 * The task Controls panel `aside#graph-task-controls`, hidden and unwired: the Search section, the View section (Dependents
 * depth, Group by folder, Show package scopes, Show scripts), then the Projects grid. Show scripts starts hidden: only the
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
  const projectsSection = controlsSection(PROJECTS_SECTION_TITLE, list);
  const panel = textElement('aside', 'graph-controls graph-task-controls', '');

  search.setAttribute('aria-label', SEARCH_TASKS_LABEL);
  list.setAttribute('role', 'grid');
  scriptsLine.hidden = true;
  panel.id = TASK_CONTROLS_ID;
  panel.hidden = true;
  panel.append(searchSection, viewSection, projectsSection);

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
