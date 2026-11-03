import { groupedSavedState } from './graph-saved-state.spec.util.ts';
import type { GraphEdge } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import { edgeIdOf } from '../../../src/graph/utils/edge-id.util.ts';
import { freshViewStateOf } from '../../../src/graph/utils/fresh-view-state.util.ts';
import { U0_EDGES_STUB, U0_LIBS_UI_STUB, U0_STATE_STUB } from '../stubs/graph-u0.stub.ts';

export const UI = '@company/ui';

export const LIBS_UI = 'libs/ui';

export const ALL_EDGE_IDS: string[] = U0_EDGES_STUB.map(edgeIdOf);

/** The ids of the U0 edges with an end in one of `names`, read from the stub's edge list, not from the page. */
const edgeIdsWithAnEndIn = (names: string[]): string[] => {
  const hasEndIn = (edge: GraphEdge): boolean => names.includes(edge.source) || names.includes(edge.target);

  return U0_EDGES_STUB.filter(hasEndIn).map(edgeIdOf);
};

/** `@company/ui` links to ui-button, ui-forms, ui-theme and from admin, docs, web: 6 edges. */
export const UI_EDGE_IDS: string[] = edgeIdsWithAnEndIn([UI]);

export const LIBS_UI_EDGE_IDS: string[] = edgeIdsWithAnEndIn(U0_LIBS_UI_STUB);

export const REST_EDGE_IDS: string[] = ALL_EDGE_IDS.filter((id): boolean => !UI_EDGE_IDS.includes(id));

const FRESH: GraphViewState = freshViewStateOf(U0_STATE_STUB.hash);

export const FLAT_SAVED: GraphViewState = { ...FRESH, grouped: false };

export const GROUPED_SAVED: GraphViewState = groupedSavedState(U0_STATE_STUB.hash);
