import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphPositionsMessage, LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { DragSnapshots, GraphLayoutsDeps } from '../common/graph-layouts.type.ts';
import type { GraphDrag } from '../common/graph-page.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';
import { postableRoutesOf } from '../utils/elk-routes.util.ts';

/** Posts dragged positions for the host cache, only for an ELK or cached layout; a fallback layout is never cached. */
const postDragged = (bridge: Bridge, engine: LayoutEngine | null, message: GraphPositionsMessage): void => {
  const isCacheable = engine === 'elk' || engine === 'cache';

  if (!isCacheable) return;

  bridge.post(message);
};

/**
 * Keeps a drag in the snapshot of `mode`, the mode on screen: its touched edges lose their routes and are drawn
 * straight, the rest keep theirs. The post carries the routes left, less those the host would drop for their bends.
 */
export const keepDrag = (deps: GraphLayoutsDeps, snapshots: DragSnapshots, mode: LayoutGrouping, drag: GraphDrag): void => {
  const drawn = deps.drawn();

  if (drawn === null) return;

  snapshots.drag(mode, drag.positions, drag.touched);

  const routes = snapshots.routesOf(mode);
  const postable = postableRoutesOf(routes);
  const message: GraphPositionsMessage = {
    type: 'positions',
    hash: drawn.hash,
    positions: drag.positions,
    routes: postable,
    grouping: mode
  };

  deps.view.setRoutes(routes);
  postDragged(deps.bridge, snapshots.engineOf(mode), message);
};
