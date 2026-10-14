import { diffModels } from './model-diff.util.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { RefreshTarget } from '../common/tree-node.type.ts';

/**
 * Spec §4.3: the root when its error presence or kind changed, its model went away, or the package set or a path
 * changed; otherwise the names of the packages whose node changed (none: nothing to redraw).
 */
export const refreshTarget = (change: RootChange): RefreshTarget => {
  const { before, after } = change;
  const isErrorChanged = change.errorBefore !== change.errorAfter;

  if (isErrorChanged || after === null) return 'root';

  const diff = diffModels(before, after);

  if (diff.structural) return 'root';

  return diff.changed;
};
