import { freshModulesViewOf } from './fresh-view-state.util.ts';
import { defaultExpandedOf } from './module-expand.util.ts';
import { moduleTreeOf } from './module-tree.util.ts';
import type { ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { ModulesViewState } from '../../bridge/common/graph-view-state.type.ts';

/** The view `packageName` is entered on: `saved` when it is that package's, a fresh one otherwise. */
export const enteredModulesViewOf = (saved: ModulesViewState | null, packageName: string): ModulesViewState => {
  if (saved?.packageName === packageName) return saved;

  return freshModulesViewOf(packageName);
};

/** The view a found scan of `name` draws: `saved`, else a fresh one, with the default expansion when none is set up yet. */
export const shownModulesViewOf = (saved: ModulesViewState | null, name: string, found: ModulesFound): ModulesViewState => {
  const view = saved ?? freshModulesViewOf(name);
  const expanded = view.expanded ?? defaultExpandedOf(moduleTreeOf(found.files));
  const shown: ModulesViewState = { ...view, expanded };

  return shown;
};
