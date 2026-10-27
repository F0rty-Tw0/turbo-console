import { freshViewStateOf } from './fresh-view-state.util.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import { LARGE_GRAPH_PACKAGES } from '../common/graph.const.ts';

/**
 * The state a graph opens with. A large graph opens grouped with every folder collapsed while no grouping choice is
 * saved: nothing saved yet, also after an earlier hash, or a state saved before folders existed, whose fields are kept
 * except its camera, as the view fits a state that differs from `saved`. Any other case keeps `saved`, so a saved choice
 * is never overridden.
 */
export const openingStateOf = (
  saved: GraphViewState | null,
  hash: string,
  folders: string[],
  packageCount: number,
  isGroupingSaved: boolean
  // eslint-disable-next-line max-params -- the five facts the rule reads; a bag type would only rename them
): GraphViewState | null => {
  const isLarge = packageCount > LARGE_GRAPH_PACKAGES;
  const isOpening = isLarge && !isGroupingSaved;

  if (!isOpening) return saved;

  const base = saved ?? freshViewStateOf(hash);
  const state: GraphViewState = { ...base, grouped: true, collapsed: folders };

  return state;
};
