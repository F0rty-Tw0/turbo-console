import type { RowContext } from '../common/tree-node.type.ts';

const NO_LIVE: ReadonlySet<string> = Object.freeze(new Set<string>());

/**
 * The running task ids of `root` that can change a view: while scripts are shown none can, so no view reads live ids and
 * the run store is not asked.
 */
export const liveOf = (context: RowContext, root: string): ReadonlySet<string> => {
  if (context.scriptsShown) return NO_LIVE;

  return context.live(root);
};
