import { actionButton, leadOf, lineOf, nameButton, sectionOf, viewBase } from './details-parts.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { PickingDetails, PickingGroup } from '../common/details-view.type.ts';
import { CANCEL_LABEL, FILTER_LABEL, NONE_TEXT, NO_MATCH_TEXT, PICKING_LEAD_TEXT } from '../common/details.const.ts';
import type { CandidateGroupModel, CandidateKey, CandidateModel, PickingViewModel } from '../common/details.type.ts';
import { candidateTitleOf, pickingTitleOf, stepsTextOf } from '../utils/details-text.util.ts';

type GroupSection = {
  readonly section: HTMLElement;
  readonly group: PickingGroup;
};

/** A candidate row; in a path group the name button is described by its distance in links. */
const candidateItem = (key: CandidateKey, candidate: CandidateModel, index: number): HTMLLIElement => {
  const li = textElement('li', 'details-item', '');
  const button = nameButton(candidate.name);

  li.append(button);

  if (candidate.steps === null) return li;

  const id = `details-steps-${key}-${index}`;
  const stepsText = stepsTextOf(candidate.steps);
  const steps = textElement('span', 'details-steps', stepsText);

  steps.id = id;
  button.setAttribute('aria-describedby', id);
  li.append(steps);

  return li;
};

/** The rows of a group's filtered candidates; also used to rebuild a list in place as the filter changes. */
export const candidateItems = (group: CandidateGroupModel): HTMLLIElement[] => {
  return group.items.map((candidate, index) => candidateItem(group.key, candidate, index));
};

/** One candidate group; `empty` reads "None" when the group has no candidates at all, "No match" when the filter left none. */
const groupSection = (start: string, model: CandidateGroupModel): GroupSection => {
  const section = sectionOf();
  const title = candidateTitleOf(model.key, start, model.total);
  const heading = textElement('h3', 'details-subheading', title);
  const list = textElement('ul', 'details-list', '');
  const items = candidateItems(model);
  const emptyText = model.total === 0 ? NONE_TEXT : NO_MATCH_TEXT;
  const empty = lineOf(emptyText);

  section.dataset['group'] = model.key;
  list.append(...items);
  empty.hidden = items.length > 0;
  section.append(heading, list, empty);

  const group: PickingGroup = { heading, list, empty };
  const parts: GroupSection = { section, group };

  return parts;
};

const filterInput = (): HTMLInputElement => {
  const input = textElement('input', 'details-filter', '');

  input.type = 'search';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', FILTER_LABEL);

  return input;
};

/** Picking a trace end: a filter over the three candidate groups, then Cancel. */
export const pickingView = (model: PickingViewModel, isOverlay: boolean): PickingDetails => {
  const title = pickingTitleOf(model.start);
  const base = viewBase('picking', title, isOverlay);
  const lead = leadOf(PICKING_LEAD_TEXT);
  const filter = filterInput();
  const sections = model.groups.map((group) => groupSection(model.start, group));
  const sectionElements = sections.map((parts) => parts.section);
  const groups = sections.map((parts) => parts.group);
  const cancel = actionButton(CANCEL_LABEL);

  base.root.append(lead, filter, ...sectionElements, cancel);

  const view: PickingDetails = { ...base, kind: 'picking', filter, groups, cancel };

  return view;
};
