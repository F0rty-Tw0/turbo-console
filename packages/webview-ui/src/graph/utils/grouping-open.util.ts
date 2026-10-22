import { freshViewStateOf } from './fresh-view-state.util.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import { LARGE_GRAPH_PACKAGES } from '../common/graph.const.ts';

/**
 * The state a graph opens with. A large graph that has nothing saved and is the page's first opens grouped with every
 * folder collapsed; any other case keeps `saved`, so a later hash change or a saved choice is never overridden.
 */
export const openingStateOf = (
  saved: GraphViewState | null,
  hash: string,
  folders: string[],
  packageCount: number,
  hasShownGraph: boolean
  // eslint-disable-next-line max-params -- the five facts the rule reads; a bag type would only rename them
): GraphViewState | null => {
  const isLarge = packageCount > LARGE_GRAPH_PACKAGES;
  const isOpening = saved === null && !hasShownGraph && isLarge;

  if (!isOpening) return saved;

  const fresh = freshViewStateOf(hash);
  const state: GraphViewState = { ...fresh, grouped: true, collapsed: folders };

  return state;
};
