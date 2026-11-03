import type { GraphWebviewMessage, Routes } from '@turbo-console/webview-ui';

import { parsePositions, parseRoutes } from './graph-cache.util.ts';
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

/** The key count of `raw.routes` when it is an object, else 0. A throwing getter or proxy trap throws. */
const routesSizeOf = (raw: unknown): number => {
  if (!isRecord(raw) || !('routes' in raw)) return 0;

  const { routes } = raw;

  if (!isRecord(routes)) return 0;

  return Object.keys(routes).length;
};

/** The character count of `raw.png` when `raw` is an `exportImage` whose `png` is a string, else `null`. A throwing getter throws. */
const pngLengthOf = (raw: unknown): number | null => {
  if (!isRecord(raw) || !('type' in raw) || !('png' in raw)) return null;

  const { type, png } = raw;
  const isExportText = type === 'exportImage' && typeof png === 'string';

  if (!isExportText) return null;

  return png.length;
};

/** The routes `parseRoutes` keeps; `{}` when `raw` is not a record or is oversized, whose values are then never read. */
const routesOf = (raw: unknown, isOversized: boolean): Routes => {
  const none: Routes = {};

  if (isOversized) return none;

  return parseRoutes(raw) ?? none;
};

/**
 * A schema-checked message, with its `positions` record checked and copied by `parsePositions`; `null` when it fails.
 * Its `routes` never fail the message: an oversized or non-record `routes` is `{}`, a bad route is dropped alone.
 */
const checkedMessageOf = (message: SchemaGraphMessage, isRoutesOversized: boolean): GraphWebviewMessage | null => {
  if (message.type !== 'positions') return message;

  const positions = parsePositions(message.positions);

  if (positions === null) return null;

  const routes = routesOf(message.routes, isRoutesOversized);
  const checked: GraphWebviewMessage = { type: 'positions', hash: message.hash, positions, routes, grouping: message.grouping };

  return checked;
};

/**
 * The webview is a trust boundary: a value that fails the schema is `null`; only the keys the schema names survive.
 * A `positions` record past `POSITIONS_MAX` keys is `null` before anything walks it; a `routes` record past it is `{}`
 * the same way, with no value read. Never throws: `safeParse`
 * rethrows a throwing getter or proxy trap, which is `null` too.
 */
export const parseGraphMessage = (raw: unknown): GraphWebviewMessage | null => {
  try {
    const size = positionsSizeOf(raw);

    if (size > POSITIONS_MAX) return null;

    const parsed = graphMessageSchema.safeParse(raw);

    if (!parsed.success) return null;

    const isRoutesOversized = routesSizeOf(raw) > POSITIONS_MAX;

    return checkedMessageOf(parsed.data, isRoutesOversized);
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
