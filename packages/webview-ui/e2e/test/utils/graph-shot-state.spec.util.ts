import type { GraphReady, Positions } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import { freshViewStateOf } from '../../../src/graph/utils/fresh-view-state.util.ts';
import type { ShotSetup } from '../../common/graph-shots.type.ts';

/** The setup's state with `positions` stored in the cache field it names. */
export const cachedShotState = (setup: ShotSetup, positions: Positions): GraphReady => {
  if (setup.cache === 'positions') {
    const flat: GraphReady = { ...setup.state, positions };

    return flat;
  }

  const grouped: GraphReady = { ...setup.state, folderPositions: positions };

  return grouped;
};

/** A fresh view of `hash` with the Controls and Details panels closed: a fresh view opens both. */
export const closedPanelsSavedState = (hash: string): GraphViewState => {
  const fresh = freshViewStateOf(hash);
  const state: GraphViewState = { ...fresh, controlsOpen: false, detailsOpen: false };

  return state;
};
