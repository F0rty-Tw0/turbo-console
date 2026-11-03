import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { LayoutGrouping } from '../../bridge/common/graph-message.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';

/** Only ELK positions go to the host cache of `grouping`; a fallback layout is never cached. */
export const postLayout = (bridge: Bridge, result: LayoutResult, grouping: LayoutGrouping): void => {
  const { hash, positions, routes } = result;

  if (result.engine === 'elk') bridge.post({ type: 'positions', hash, positions, routes, grouping });

  bridge.post({ type: 'layoutDone', ms: result.ms, engine: result.engine });
};
