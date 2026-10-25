import type { GraphEdge, GraphPackage, GraphReady, Position, Positions } from '../../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../bridge/common/graph-view-state.type.ts';
import { freshViewStateOf } from '../../utils/fresh-view-state.util.ts';

const packageOf = (name: string, path: string): GraphPackage => {
  const pkg: GraphPackage = { name, path, tags: [], taskCount: 0 };

  return pkg;
};

const positionsOf = (x: number): Positions => {
  const web: Position = { x, y: 0 };
  const ui: Position = { x, y: 100 };
  const core: Position = { x, y: 200 };
  const positions: Positions = { web, ui, core };

  return positions;
};

const PACKAGES: GraphPackage[] = [packageOf('web', 'apps/web'), packageOf('ui', 'packages/ui'), packageOf('core', 'packages/core')];

const EDGES: GraphEdge[] = [
  { source: 'web', target: 'ui' },
  { source: 'ui', target: 'core' }
];

export const FLAT_POSITIONS_STUB: Positions = positionsOf(0);

export const GROUPED_POSITIONS_STUB: Positions = positionsOf(10);

export const DRAGGED_POSITIONS_STUB: Positions = positionsOf(20);

export const OTHER_POSITIONS_STUB: Positions = positionsOf(30);

/** `web` in `apps`, `ui` and `core` in `packages`; the flat layout cached, the grouped one not. */
export const STATE_STUB: GraphReady = {
  kind: 'graph',
  hash: 'h1',
  packages: PACKAGES,
  edges: EDGES,
  positions: FLAT_POSITIONS_STUB,
  folderPositions: null,
  tasks: [],
  atomGroups: []
};

const FRESH: GraphViewState = freshViewStateOf('h1');

export const SAVED_GROUPED_STUB: GraphViewState = { ...FRESH, grouped: true };
