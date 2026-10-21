import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import { DEFAULT_DEPTH } from '../common/graph.const.ts';

const ORIGIN: Position = { x: 0, y: 0 };

/** The view state of a graph with nothing saved: the default camera, no selection and the controls' defaults. */
export const freshViewStateOf = (hash: string): GraphViewState => {
  const state: GraphViewState = {
    hash,
    zoom: 1,
    pan: ORIGIN,
    selected: null,
    controlsOpen: true,
    search: '',
    depth: DEFAULT_DEPTH,
    hidden: [],
    focus: null,
    tags: []
  };

  return state;
};
