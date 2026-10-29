import { CONTROLS_FILTERED_LABEL, CONTROLS_LABEL, ROOT_FOLDER, SHOW_ALL_LABEL } from '../common/graph.const.ts';
import type { MenuTarget } from '../common/widget.type.ts';

/** The folder as a group title; `''` is the root folder, and a real folder named like it gets `./` so the two differ. */
export const folderTitleOf = (folder: string): string => {
  if (folder === '') return ROOT_FOLDER;

  if (folder === ROOT_FOLDER) return `./${folder}`;

  return folder;
};

export const groupLabelOf = (folder: string, total: number): string => `${folder} (${total})`;

export const countTextOf = (visible: number, total: number): string => `Showing ${visible} of ${total} packages`;

export const controlsLabelOf = (isFiltered: boolean): string => {
  if (isFiltered) return CONTROLS_FILTERED_LABEL;

  return CONTROLS_LABEL;
};

/** Show all with how many packages it brings back; a filter that hides none, like a focus on a lone package, reads plain Show all. */
export const showAllTextOf = (hiddenCount: number): string => {
  if (hiddenCount === 0) return SHOW_ALL_LABEL;

  return `${SHOW_ALL_LABEL} (${hiddenCount} hidden)`;
};

export const showLabelOf = (name: string): string => `Show ${name}`;

export const focusLabelOf = (name: string): string => `Focus ${name}`;

/** The task details owner button's name: it shows the task's package in the package graph. */
export const showPackageLabelOf = (name: string): string => `Show package ${name}`;

export const folderToggleTextOf = (isCollapsed: boolean): string => (isCollapsed ? 'Expand' : 'Collapse');

export const folderToggleLabelOf = (title: string, isCollapsed: boolean): string =>
  `${folderToggleTextOf(isCollapsed)} folder ${title}`;

export const folderFocusLabelOf = (title: string): string => `Focus folder ${title}`;

export const folderActionsLabelOf = (title: string): string => `Actions for folder ${title}`;

export const packageActionsLabelOf = (name: string): string => `Actions for ${name}`;

/** The accessible name of the selected package's node toolbar. */
export const packageToolbarLabelOf = (name: string): string => `Package ${name}`;

/** The accessible name of the target's "…" and of the menu it opens. */
export const actionsLabelOf = (target: MenuTarget): string => {
  if (target.kind === 'package') return packageActionsLabelOf(target.name);

  const title = folderTitleOf(target.folder);

  return folderActionsLabelOf(title);
};
