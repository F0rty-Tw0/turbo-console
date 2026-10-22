import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { GraphPositionsMessage } from '../../bridge/common/graph-message.type.ts';
import type { LayoutEngine } from '../common/graph-probe.type.ts';

/** Posts dragged positions for the host cache, only for an ELK or cached layout; a fallback layout is never cached. */
export const postDragged = (bridge: Bridge, engine: LayoutEngine | null, message: GraphPositionsMessage): void => {
  const isCacheable = engine === 'elk' || engine === 'cache';

  if (!isCacheable) return;

  bridge.post(message);
};
