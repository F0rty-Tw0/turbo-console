import { postLayout } from './layout-post.ts';
import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { Positions } from '../../bridge/common/graph-state.type.ts';
import type { DrawnGraph, GraphView, PageElements } from '../common/graph-page.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';

/** Posts dragged positions for the host cache, only for an ELK or cached layout; a fallback layout is never cached. */
export const postDragged = (bridge: Bridge, drawn: DrawnGraph | null, engine: LayoutEngine | null, positions: Positions): void => {
  const isCacheable = engine === 'elk' || engine === 'cache';

  if (drawn === null || !isCacheable) return;

  bridge.post({ type: 'positions', hash: drawn.hash, positions });
};

/** Shows a Re-layout or Retry run: its positions, the fallback notice only for a fallback, a fit; then posts it. */
export const showRelayout = (bridge: Bridge, page: PageElements, view: GraphView, result: LayoutResult): void => {
  view.setPositions(result.positions);
  page.notice.hidden = result.engine !== 'fallback';
  view.fit();
  postLayout(bridge, result);
};
