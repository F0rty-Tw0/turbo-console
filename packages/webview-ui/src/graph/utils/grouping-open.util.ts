import { freshViewStateOf } from './fresh-view-state.util.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import { LARGE_GRAPH_PACKAGES } from '../common/graph.const.ts';

/** The graph about to open: its hash, its folders, how many packages it has and whether a grouping choice is saved for it. */
type OpeningGraph = {
  readonly hash: string;
  readonly folders: string[];
  readonly packageCount: number;
  readonly isGroupingSaved: boolean;
};

/**
 * The state a graph opens with. A large graph opens grouped with every folder collapsed while no grouping choice is
 * saved: nothing saved yet, also after an earlier hash, or a state saved before folders existed, whose fields are kept
 * except its camera, as the view opens a state that differs from `saved`. Any other case keeps `saved`, so a saved choice
 * is never overridden.
 */
export const openingStateOf = (saved: GraphViewState | null, graph: OpeningGraph): GraphViewState | null => {
  const { hash, folders, packageCount, isGroupingSaved } = graph;
  const isLarge = packageCount > LARGE_GRAPH_PACKAGES;
  const isOpening = isLarge && !isGroupingSaved;

  if (!isOpening) return saved;

  const base = saved ?? freshViewStateOf(hash);
  const state: GraphViewState = { ...base, grouped: true, collapsed: folders };

  return state;
};
