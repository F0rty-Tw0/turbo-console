import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';
import { postableRoutesOf } from '../utils/elk-routes.util.ts';

/**
 * Only ELK positions go to the host cache of `grouping`; a fallback layout is never cached. The post leaves out routes
 * with more than `ROUTE_BENDS_MAX` bends, which the host would drop; `result.routes` keeps them for the page.
 */
export const postLayout = (bridge: Bridge, result: LayoutResult, grouping: LayoutGrouping): void => {
  const { hash, positions } = result;
  const routes = postableRoutesOf(result.routes);

  if (result.engine === 'elk') bridge.post({ type: 'positions', hash, positions, routes, grouping });

  bridge.post({ type: 'layoutDone', ms: result.ms, engine: result.engine });
};
