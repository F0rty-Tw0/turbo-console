import type { GraphWebviewMessage } from '@turbo-console/webview-ui';

import { parsePositions } from './graph-cache.util.ts';
import { isRecord } from './record.util.ts';
import { UNPRINTABLE_MESSAGE } from '../../shared/common/panel.const.ts';
import { droppedMessageText } from '../../shared/utils/dropped-message.util.ts';
import { graphMessageSchema } from '../common/graph-message.schema.ts';
import { POSITIONS_MAX } from '../common/graph.const.ts';
import type { SchemaGraphMessage } from '../common/graph.type.ts';

/** The key count of `raw.positions` when it is an object, else 0. A throwing getter or proxy trap throws. */
const positionsSizeOf = (raw: unknown): number => {
  if (!isRecord(raw) || !('positions' in raw)) return 0;

  const { positions } = raw;

  if (!isRecord(positions)) return 0;

  return Object.keys(positions).length;
};

/** The character count of `raw.png` when `raw` is an `exportImage` whose `png` is a string, else `null`. A throwing getter throws. */
const pngLengthOf = (raw: unknown): number | null => {
  if (!isRecord(raw) || !('type' in raw) || !('png' in raw)) return null;

  const { type, png } = raw;
  const isExportText = type === 'exportImage' && typeof png === 'string';

  if (!isExportText) return null;

  return png.length;
};

/** A schema-checked message, with its `positions` record checked and copied by `parsePositions`; `null` when it fails. */
const checkedMessageOf = (message: SchemaGraphMessage): GraphWebviewMessage | null => {
  if (message.type !== 'positions') return message;

  const positions = parsePositions(message.positions);

  if (positions === null) return null;

  const checked: GraphWebviewMessage = { type: 'positions', hash: message.hash, positions, grouping: message.grouping };

  return checked;
};

/**
 * The webview is a trust boundary: a value that fails the schema is `null`; only the keys the schema names survive.
 * A `positions` record past `POSITIONS_MAX` keys is `null` before anything walks it. Never throws: `safeParse`
 * rethrows a throwing getter or proxy trap, which is `null` too.
 */
export const parseGraphMessage = (raw: unknown): GraphWebviewMessage | null => {
  try {
    const size = positionsSizeOf(raw);

    if (size > POSITIONS_MAX) return null;

    const parsed = graphMessageSchema.safeParse(raw);

    if (!parsed.success) return null;

    return checkedMessageOf(parsed.data);
  } catch {
    return null;
  }
};

/**
 * The log text of a dropped graph message: only its size when its `positions` is past `POSITIONS_MAX` or it is an
 * `exportImage` with a string `png`, which can be 32 MiB and is never stringified; else its cut JSON. Never throws.
 */
export const droppedGraphText = (raw: unknown): string => {
  try {
    const size = positionsSizeOf(raw);

    if (size > POSITIONS_MAX) return `positions with ${size} keys`;

    const pngLength = pngLengthOf(raw);

    if (pngLength !== null) return `exportImage with ${pngLength} chars`;
  } catch {
    return UNPRINTABLE_MESSAGE;
  }

  return droppedMessageText(raw);
};
