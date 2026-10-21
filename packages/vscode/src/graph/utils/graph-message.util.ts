import type { GraphWebviewMessage } from '@turbo-console/webview-ui';

import { isRecord } from './graph-cache.util.ts';
import { UNPRINTABLE_MESSAGE } from '../../shared/common/panel.const.ts';
import { droppedMessageText } from '../../shared/utils/dropped-message.util.ts';
import { graphMessageSchema } from '../common/graph-message.schema.ts';
import { POSITIONS_MAX } from '../common/graph.const.ts';

/** The key count of `raw.positions` when it is an object, else 0. A throwing getter or proxy trap throws. */
const positionsSizeOf = (raw: unknown): number => {
  if (!isRecord(raw) || !('positions' in raw)) return 0;

  const { positions } = raw;

  if (!isRecord(positions)) return 0;

  return Object.keys(positions).length;
};

/**
 * The webview is a trust boundary: a value that fails the schema is `null`; only the keys the schema names survive.
 * A `positions` record past `POSITIONS_MAX` keys is `null` before the schema walks it. Never throws: `safeParse`
 * rethrows a throwing getter or proxy trap, which is `null` too.
 */
export const parseGraphMessage = (raw: unknown): GraphWebviewMessage | null => {
  try {
    const size = positionsSizeOf(raw);

    if (size > POSITIONS_MAX) return null;

    const parsed = graphMessageSchema.safeParse(raw);

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/** The log text of a dropped graph message: only its size when its `positions` is past `POSITIONS_MAX`, else its cut JSON. Never throws. */
export const droppedGraphText = (raw: unknown): string => {
  try {
    const size = positionsSizeOf(raw);

    if (size > POSITIONS_MAX) return `positions with ${size} keys`;
  } catch {
    return UNPRINTABLE_MESSAGE;
  }

  return droppedMessageText(raw);
};
