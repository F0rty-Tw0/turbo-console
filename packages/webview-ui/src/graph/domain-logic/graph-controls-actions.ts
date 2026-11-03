import type { ControlsActions, ControlsMounted, ControlsOps } from '../common/graph-controls.type.ts';
import { depthOf, isFiltered, showAllOf, toggleGroup, toggleRow, withDepth, withTag } from '../utils/controls-rules.util.ts';

const setDepth = (mounted: ControlsMounted, ops: ControlsOps, text: string): void => {
  const depth = depthOf(text);

  if (depth !== null) ops.change(mounted, withDepth(ops.applied, depth));
};

/**
 * Clears every filter. Show all then hides, so when it held focus, focus moves to the package grid's one Tab stop,
 * or to the search box when the search left no line to hold it.
 */
const showAll = (mounted: ControlsMounted, ops: ControlsOps): void => {
  const isOn = isFiltered(ops.applied);

  if (!isOn) return;

  const { showAll: button, list, search } = mounted.elements;
  const hadFocus = button.ownerDocument.activeElement === button;

  ops.change(mounted, showAllOf(ops.applied));

  if (!hadFocus) return;

  const stop = list.querySelector<HTMLElement>('[tabindex="0"]');
  const target = stop ?? search;

  target.focus();
};

/** A header's Focus button: focuses the folder, or clears the focus when the folder already is it. */
const toggleFolderFocus = (ops: ControlsOps, folder: string): void => {
  const focused = ops.focusedFolder();

  if (focused === folder) ops.clearFocus();
  else ops.focusFolder(folder);
};

/**
 * The panel's actions, each one call on `ops`, `onToggleFolder` or `onScope`; the mounted panel, the filters and the depth
 * are read when the event fires, so a relabelled graph reaches every listener.
 */
export const controlsActionsOf = (
  current: () => ControlsMounted,
  ops: ControlsOps,
  onToggleFolder: (folder: string) => void,
  onScope: (shown: boolean) => void
): ControlsActions => {
  const actions: ControlsActions = {
    onRow: (name, isChecked): void => ops.edit(current(), toggleRow(ops.applied, name, isChecked)),
    onGroup: (names, isChecked): void => ops.edit(current(), toggleGroup(ops.applied, names, isChecked)),
    onFocus: (name): void => ops.focus(current(), name),
    onDepth: (text): void => setDepth(current(), ops, text),
    onDepthBlur: (): void => {
      current().elements.depth.value = String(ops.applied.depth);
    },
    onGrouping: (isGrouped): void => ops.setGrouping(isGrouped),
    onToggle: onToggleFolder,
    onFolderFocus: (folder): void => toggleFolderFocus(ops, folder),
    onTag: (tag, isChecked): void => ops.change(current(), withTag(ops.applied, tag, isChecked)),
    onShowAll: (): void => showAll(current(), ops),
    onSearch: (text): void => ops.setSearch(current(), text),
    onPick: (name): void => ops.pick(name),
    onScope
  };

  return actions;
};
