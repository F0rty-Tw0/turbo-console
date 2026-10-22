import { actionButton, markOf, nameButton, sectionOf, viewBase } from './details-parts.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { FolderMemberItem, FolderViewElements } from '../common/details-view.type.ts';
import { CLEAR_FOCUS_LABEL, EXCLUDE_FOLDER_LABEL, FOCUS_FOLDER_LABEL } from '../common/details.const.ts';
import type { FolderViewModel, NeighbourModel } from '../common/details.type.ts';
import { folderToggleTextOf } from '../utils/controls-text.util.ts';

type FolderButtons = {
  readonly actions: HTMLElement;
  readonly toggle: HTMLButtonElement;
  readonly focus: HTMLButtonElement;
  readonly exclude: HTMLButtonElement;
};

type MemberList = {
  readonly section: HTMLElement;
  readonly members: FolderMemberItem[];
};

const actionsOf = (model: FolderViewModel): FolderButtons => {
  const actions = textElement('div', 'details-actions', '');
  const row = textElement('div', 'details-row', '');
  const toggleText = folderToggleTextOf(model.isCollapsed);
  const toggle = actionButton(toggleText);
  const focusText = model.isFocused ? CLEAR_FOCUS_LABEL : FOCUS_FOLDER_LABEL;
  const focus = actionButton(focusText);
  const exclude = actionButton(EXCLUDE_FOLDER_LABEL);

  row.append(toggle, focus, exclude);
  actions.append(row);

  const parts: FolderButtons = { actions, toggle, focus, exclude };

  return parts;
};

/** Appends a member's row to `list`; a hidden member's button is `aria-disabled`, never `disabled`, so it keeps focus. */
const memberItem = (list: HTMLUListElement, member: NeighbourModel): FolderMemberItem => {
  const li = textElement('li', 'details-item', '');
  const pick = nameButton(member.name);
  const mark = markOf();

  mark.hidden = member.isVisible;
  li.append(pick, mark);
  list.append(li);

  if (!member.isVisible) pick.setAttribute('aria-disabled', 'true');

  const item: FolderMemberItem = { name: member.name, pick, mark };

  return item;
};

const memberList = (model: FolderViewModel): MemberList => {
  const section = sectionOf();
  const heading = textElement('h3', 'details-subheading', model.packagesTitle);
  const list = textElement('ul', 'details-list', '');
  const itemOf = (member: NeighbourModel): FolderMemberItem => memberItem(list, member);
  const members = model.members.map(itemOf);

  section.append(heading, list);

  const parts: MemberList = { section, members };

  return parts;
};

/** A folder's facts: its counts, Expand or Collapse, Focus folder and Exclude folder, and every package in it. */
export const folderView = (model: FolderViewModel): FolderViewElements => {
  const base = viewBase('folder', model.title, model.isOverlay);
  const summary = textElement('p', 'details-muted', model.summary);
  const parts = actionsOf(model);
  const list = memberList(model);
  const { actions, ...buttons } = parts;

  base.root.append(summary, actions, list.section);

  const view: FolderViewElements = { ...base, ...buttons, kind: 'folder', summary, members: list.members };

  return view;
};
