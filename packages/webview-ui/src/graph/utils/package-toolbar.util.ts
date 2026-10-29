import { NODE_HEIGHT, NODE_TOOLBAR_MIN_PX } from '../common/graph.const.ts';
import type { PackageMenuState, PackageToolbarShown } from '../common/widget.type.ts';

/** Whether the node is too short on screen for its toolbar: only the "…" stays. */
export const isNodeToolbarCompact = (zoom: number): boolean => NODE_HEIGHT * zoom < NODE_TOOLBAR_MIN_PX;

/** The buttons the package toolbar shows besides the "…", which always shows: none while compact. */
export const packageToolbarShownOf = (state: PackageMenuState, hasFolder: boolean, isCompact: boolean): PackageToolbarShown => {
  const shown: PackageToolbarShown = {
    focus: !isCompact,
    startTrace: !isCompact,
    showTasks: !isCompact && state.hasTasks,
    collapse: !isCompact && hasFolder
  };

  return shown;
};

/** The full toolbar's buttons, the "…" included. */
export const packageToolbarCountOf = (state: PackageMenuState, hasFolder: boolean): number => {
  const shown = packageToolbarShownOf(state, hasFolder, false);
  const buttons = Object.values(shown).filter(Boolean);

  return buttons.length + 1;
};
