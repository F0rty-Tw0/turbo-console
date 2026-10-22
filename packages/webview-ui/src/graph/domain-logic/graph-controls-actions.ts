import type { ControlsActions, ControlsMounted, ControlsOps } from '../common/graph-controls.type.ts';
import { toggleGroup, toggleRow, withTag } from '../utils/controls-rules.util.ts';

/** The panel's actions for `mounted`, each one call on `ops`; the filters and the depth are read when the event fires. */
export const controlsActionsOf = (mounted: ControlsMounted, ops: ControlsOps): ControlsActions => {
  const actions: ControlsActions = {
    onRow: (name, isChecked): void => ops.edit(mounted, toggleRow(ops.applied, name, isChecked)),
    onGroup: (names, isChecked): void => ops.edit(mounted, toggleGroup(ops.applied, names, isChecked)),
    onFocus: (name): void => ops.focus(mounted, name),
    onDepth: (text): void => ops.setDepth(mounted, text),
    onDepthBlur: (): void => {
      mounted.elements.depth.value = String(ops.depth);
    },
    onGrouping: (isGrouped): void => ops.setGrouping(isGrouped),
    onTag: (tag, isChecked): void => ops.change(mounted, withTag(ops.applied, tag, isChecked)),
    onShowAll: (): void => ops.showAll(mounted),
    onSearch: (text): void => ops.setSearch(mounted, text),
    onPick: (name): void => ops.pick(name)
  };

  return actions;
};
