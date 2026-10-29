import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import { FOCUS_FOLDER_LABEL, START_TRACE_LABEL, START_TRACE_TITLE } from '../common/details.const.ts';
import { ACTION_ICONS } from '../common/graph-icon.const.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';
import { ROOT_TASK_PACKAGE, SHOW_TASKS_LABEL } from '../common/graph-task.const.ts';
import { FOCUS_PACKAGE_TITLE } from '../common/graph.const.ts';
import type { TaskToolbarElements } from '../common/task-toolbar.type.ts';
import type { FolderRowElements, PackageToolbarElements, RowKind } from '../common/widget.type.ts';
import {
  focusLabelOf,
  folderActionsLabelOf,
  folderFocusLabelOf,
  folderToggleLabelOf,
  packageActionsLabelOf,
  packageToolbarLabelOf,
  runLabelOf,
  showPackageLabelOf,
  taskToolbarLabelOf
} from '../utils/controls-text.util.ts';
import { pluralOf } from '../utils/plural.util.ts';

/** A 24 px icon button; the aria-label is its accessible name and its hover title. */
const widgetButton = (id: GraphIconId, label: string): HTMLButtonElement => {
  const button = textElement('button', 'widget-button', '');
  const icon = graphIcon(id);

  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.append(icon);

  return button;
};

/** A "…" that opens a menu. */
const menuButton = (label: string): HTMLButtonElement => {
  const button = widgetButton('ellipsis', label);

  button.setAttribute('aria-haspopup', 'menu');

  return button;
};

/** The chevron of an expanded folder collapses it; a collapsed folder's expands it. */
const chevronOf = (kind: RowKind, title: string): HTMLButtonElement => {
  const isExpanded = kind === 'box';
  const icon = isExpanded ? 'chevron-down' : 'chevron-right';
  const verb = isExpanded ? 'Collapse' : 'Expand';
  const chevron = widgetButton(icon, `${verb} ${title}`);

  chevron.setAttribute('aria-expanded', String(isExpanded));

  return chevron;
};

/** A package count as a pill: the number is drawn, screen readers and the tooltip get "12 packages". */
const countBadge = (count: number): HTMLElement => {
  const label = pluralOf(count, 'package', 'packages');
  const badge = textElement('span', 'widget-count', '');
  const number = textElement('span', '', String(count));
  const spoken = textElement('span', 'visually-hidden', label);

  number.setAttribute('aria-hidden', 'true');
  badge.setAttribute('title', label);
  badge.append(number, spoken);

  return badge;
};

/** The folder codicon, which a container query hides on a narrow box. */
const glyphOf = (): HTMLElement => {
  const glyph = graphIcon('folder-opened');

  glyph.classList.add('widget-glyph');

  return glyph;
};

/** A row's title button: cut on screen with "…", while its `title` shows the whole name on hover. */
const titleButtonOf = (title: string): HTMLButtonElement => {
  const button = textElement('button', 'widget-title', title);

  button.type = 'button';
  button.setAttribute('title', title);

  return button;
};

/** A folder's header row, on a box or a collapsed node: the chevron, the folder glyph, title and package count badge, then Focus folder and the "…". The row is a toolbar named by its title, with the chevron its one Tab stop until the layer moves the stop. */
export const buildFolderRow = (kind: RowKind, title: string, count: number): FolderRowElements => {
  const root = textElement('div', `widget-row widget-row-${kind}`, '');
  const chevron = chevronOf(kind, title);
  const ellipsis = menuButton(folderActionsLabelOf(title));
  const glyph = glyphOf();
  const titleButton = titleButtonOf(title);
  const badge = countBadge(count);
  const focus = widgetButton(ACTION_ICONS.focus, folderFocusLabelOf(title));
  const row: FolderRowElements = { root, chevron, title: titleButton, focus, ellipsis };

  focus.title = FOCUS_FOLDER_LABEL;
  focus.setAttribute('aria-pressed', 'false');
  titleButton.tabIndex = -1;
  focus.tabIndex = -1;
  ellipsis.tabIndex = -1;
  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', title);
  root.hidden = true;
  root.append(chevron, glyph, titleButton, badge, focus, ellipsis);

  return row;
};

/** A node toolbar's hidden root: the toolbar of the selected node, named by `label`; only its buttons take pointer events. */
const nodeToolbarRootOf = (modifier: 'package' | 'task', label: string): HTMLElement => {
  const root = textElement('div', `widget-toolbar widget-toolbar-${modifier}`, '');

  root.setAttribute('role', 'toolbar');
  root.setAttribute('aria-label', label);
  root.hidden = true;

  return root;
};

/** The Show package button of a task in `packageName`; a root task has no package to show. */
const showPackageOf = (packageName: string): HTMLButtonElement | null => {
  if (packageName === ROOT_TASK_PACKAGE) return null;

  return widgetButton(ACTION_ICONS.showPackage, showPackageLabelOf(packageName));
};

/** The selected task's node toolbar, hidden until the layer places it: Run, Show package (not for `//`) and the "…". Run is its one Tab stop until the layer moves it. */
export const buildTaskToolbar = (id: string, packageName: string): TaskToolbarElements => {
  const root = nodeToolbarRootOf('task', taskToolbarLabelOf(id));
  const run = widgetButton(ACTION_ICONS.run, runLabelOf(id));
  const showPackage = showPackageOf(packageName);
  const ellipsis = menuButton(packageActionsLabelOf(id));
  const toolbar: TaskToolbarElements = { root, run, showPackage, ellipsis };
  const buttons = [showPackage, ellipsis];

  root.append(run);

  for (const button of buttons) {
    if (button === null) continue;

    button.tabIndex = -1;
    root.append(button);
  }

  return toolbar;
};

/** The Collapse folder button of a package in `folderTitle`; a flat page has none. */
const collapseOf = (folderTitle: string | null): HTMLButtonElement | null => {
  if (folderTitle === null) return null;

  const label = folderToggleLabelOf(folderTitle, false);

  return widgetButton(ACTION_ICONS.collapse, label);
};

/** Focus under a constant name, its hover title saying what a press does; the toolbar's one Tab stop until the layer moves it. */
const focusToggleOf = (name: string): HTMLButtonElement => {
  const button = widgetButton(ACTION_ICONS.focus, focusLabelOf(name));

  button.title = FOCUS_PACKAGE_TITLE;
  button.setAttribute('aria-pressed', 'false');

  return button;
};

/** The selected package's node toolbar, hidden until the layer places it: Focus, Start trace, Show tasks, Collapse folder (grouped) and the "…". Focus is its one Tab stop until the layer moves it. */
export const buildPackageToolbar = (name: string, folderTitle: string | null): PackageToolbarElements => {
  const root = nodeToolbarRootOf('package', packageToolbarLabelOf(name));
  const focus = focusToggleOf(name);
  const startTrace = widgetButton(ACTION_ICONS.startTrace, START_TRACE_LABEL);
  const showTasks = widgetButton(ACTION_ICONS.showTasks, SHOW_TASKS_LABEL);
  const collapse = collapseOf(folderTitle);
  const ellipsis = menuButton(packageActionsLabelOf(name));
  const toolbar: PackageToolbarElements = { root, focus, startTrace, showTasks, collapse, ellipsis };
  const buttons = [startTrace, showTasks, collapse, ellipsis];

  startTrace.title = START_TRACE_TITLE;
  root.append(focus);

  for (const button of buttons) {
    if (button === null) continue;

    button.tabIndex = -1;
    root.append(button);
  }

  return toolbar;
};
