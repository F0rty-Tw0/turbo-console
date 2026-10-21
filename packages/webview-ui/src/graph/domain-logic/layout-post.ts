import type { Bridge } from '../../bridge/common/bridge.type.ts';
import type { LayoutResult } from '../common/layout.type.ts';

/** Only ELK positions go to the host cache; a fallback layout is never cached. */
export const postLayout = (bridge: Bridge, result: LayoutResult): void => {
  if (result.engine === 'elk') bridge.post({ type: 'positions', hash: result.hash, positions: result.positions });

  bridge.post({ type: 'layoutDone', ms: result.ms, engine: result.engine });
};
