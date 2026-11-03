import type { GraphReady } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import { freshViewStateOf } from '../../../src/graph/utils/fresh-view-state.util.ts';
import type { ShotSetup } from '../../common/graph-shots.type.ts';
import type { PostedLayout } from '../../common/graph.type.ts';

/** The setup's state with the layout's positions and routes stored in the cache fields it names. */
export const cachedShotState = (setup: ShotSetup, layout: PostedLayout): GraphReady => {
  if (setup.cache === 'positions') {
    const flat: GraphReady = { ...setup.state, positions: layout.positions, routes: layout.routes };

    return flat;
  }

  const grouped: GraphReady = { ...setup.state, folderPositions: layout.positions, folderRoutes: layout.routes };

  return grouped;
};

/** A flat fresh view of `hash` with the Controls and Details panels closed: a fresh view opens both. */
export const closedPanelsSavedState = (hash: string): GraphViewState => {
  const fresh = freshViewStateOf(hash);
  const state: GraphViewState = { ...fresh, grouped: false, controlsOpen: false, detailsOpen: false };

  return state;
};
