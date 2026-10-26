import { actionButton, lineOf, markOf, nameButton, sectionOf, viewBase } from './details-parts.ts';
import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { NeighbourItem, PackageDetails } from '../common/details-view.type.ts';
import {
  CLEAR_FOCUS_LABEL,
  EXCLUDE_LABEL,
  EXPLAIN_LABEL,
  FOCUS_LABEL,
  NONE_TEXT,
  NO_TAGS_TEXT,
  START_TRACE_LABEL
} from '../common/details.const.ts';
import type { NeighbourModel, PackageViewModel } from '../common/details.type.ts';
import { SHOW_TASKS_LABEL } from '../common/graph-task.const.ts';
import { TAGS_LABEL } from '../common/graph.const.ts';
import { setButtonLabel } from '../utils/button-title.util.ts';
import { dependenciesTitleOf, dependentsTitleOf, explainLabelOf, openDetailsLabelOf, pathTextOf } from '../utils/details-text.util.ts';

/** The accessible name of a neighbour's Explain button, its link named dependent first. */
type ExplainLabelOf = (neighbour: string) => string;

type NeighbourList = {
  readonly section: HTMLElement;
  readonly items: NeighbourItem[];
};

type PackageActions = {
  readonly actions: HTMLElement;
  readonly openLabel: HTMLElement;
  readonly openDetails: HTMLButtonElement;
  readonly focus: HTMLButtonElement;
  readonly exclude: HTMLButtonElement;
  readonly startTrace: HTMLButtonElement;
  readonly showTasks: HTMLButtonElement;
};

const tagOf = (tag: string): HTMLElement => textElement('li', 'details-tag', tag);

const tagsOf = (tags: string[]): HTMLElement => {
  if (tags.length === 0) return lineOf(NO_TAGS_TEXT);

  const list = textElement('ul', 'details-tags', '');
  const items = tags.map(tagOf);

  list.setAttribute('aria-label', TAGS_LABEL);
  list.append(...items);

  return list;
};

const openButton = (label: HTMLElement, title: string): HTMLButtonElement => {
  const button = textElement('button', 'primary-button', '');
  const icon = graphIcon('file-text');

  button.type = 'button';
  button.title = title;
  button.append(icon, label);

  return button;
};

const actionsOf = (model: PackageViewModel): PackageActions => {
  const actions = textElement('div', 'details-actions', '');
  const openText = openDetailsLabelOf(model.taskCount);
  const openLabel = textElement('span', '', openText);
  const openDetails = openButton(openLabel, openText);
  const focusText = model.isFocused ? CLEAR_FOCUS_LABEL : FOCUS_LABEL;
  const focus = actionButton(focusText);
  const exclude = actionButton(EXCLUDE_LABEL);
  const startTrace = actionButton(START_TRACE_LABEL);
  const showTasks = actionButton(SHOW_TASKS_LABEL);
  const row = textElement('div', 'details-row', '');

  if (model.isFocused) exclude.setAttribute('aria-disabled', 'true');

  row.append(focus, exclude, startTrace, showTasks);
  actions.append(openDetails, row);

  const parts: PackageActions = { actions, openLabel, openDetails, focus, exclude, startTrace, showTasks };

  return parts;
};

/** Appends a neighbour's row to `list`; a hidden neighbour's buttons are `aria-disabled`, never `disabled`, so they keep focus. */
const neighbourItem = (list: HTMLUListElement, neighbour: NeighbourModel, explainLabel: string): NeighbourItem => {
  const li = textElement('li', 'details-item', '');
  const pick = nameButton(neighbour.name);
  const mark = markOf();
  const explain = textElement('button', 'details-explain', EXPLAIN_LABEL);

  explain.type = 'button';
  explain.dataset['name'] = neighbour.name;
  setButtonLabel(explain, explainLabel);
  mark.hidden = neighbour.isVisible;
  li.append(pick, mark, explain);
  list.append(li);

  if (!neighbour.isVisible) {
    pick.setAttribute('aria-disabled', 'true');
    explain.setAttribute('aria-disabled', 'true');
  }

  const item: NeighbourItem = { name: neighbour.name, pick, explain, mark };

  return item;
};

const neighbourList = (title: string, neighbours: NeighbourModel[], labelOf: ExplainLabelOf): NeighbourList => {
  const section = sectionOf();
  const heading = textElement('h3', 'details-subheading', title);
  const list = textElement('ul', 'details-list', '');
  const itemOf = (neighbour: NeighbourModel): NeighbourItem => neighbourItem(list, neighbour, labelOf(neighbour.name));
  const items = neighbours.map(itemOf);
  const none = lineOf(NONE_TEXT);
  const body = items.length === 0 ? none : list;

  section.append(heading, body);

  const parts: NeighbourList = { section, items };

  return parts;
};

/** A package's facts: path, tags, actions, and its direct dependencies and dependents. */
export const packageView = (model: PackageViewModel, isOverlay: boolean): PackageDetails => {
  const base = viewBase('package', model.name, isOverlay);
  const pathText = pathTextOf(model.path);
  const path = textElement('p', 'details-path', pathText);
  const tags = tagsOf(model.tags);
  const parts = actionsOf(model);
  const dependencyLabelOf = (neighbour: string): string => explainLabelOf(model.name, neighbour);
  const dependentLabelOf = (neighbour: string): string => explainLabelOf(neighbour, model.name);
  const dependenciesTitle = dependenciesTitleOf(model.dependencies.length);
  const dependentsTitle = dependentsTitleOf(model.dependents.length);
  const dependencies = neighbourList(dependenciesTitle, model.dependencies, dependencyLabelOf);
  const dependents = neighbourList(dependentsTitle, model.dependents, dependentLabelOf);
  const { actions, ...buttons } = parts;

  base.root.append(path, tags, actions, dependencies.section, dependents.section);

  const view: PackageDetails = {
    ...base,
    ...buttons,
    kind: 'package',
    dependencies: dependencies.items,
    dependents: dependents.items
  };

  return view;
};
