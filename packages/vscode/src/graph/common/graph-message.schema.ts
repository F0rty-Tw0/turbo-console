import { discriminatedUnion, gte, literal, lte, maxLength, number, object, record, regex, string, enum as zodEnum } from 'zod/mini';

import { COORDINATE_MAX, GRAPH_HASH_PATTERN, PACKAGE_NAME_MAX } from './graph.const.ts';

const packageNameSchema = string().check(maxLength(PACKAGE_NAME_MAX));

const coordinateSchema = number().check(gte(-COORDINATE_MAX), lte(COORDINATE_MAX));

const readySchema = object({ type: literal('ready') });

const reloadSchema = object({ type: literal('reload') });

const openDetailsSchema = object({ type: literal('openDetails'), packageName: packageNameSchema });

const pointSchema = object({ x: coordinateSchema, y: coordinateSchema });

const positionsSchema = object({
  type: literal('positions'),
  hash: string().check(regex(GRAPH_HASH_PATTERN)),
  positions: record(packageNameSchema, pointSchema)
});

const layoutDoneSchema = object({ type: literal('layoutDone'), ms: number(), engine: zodEnum(['elk', 'fallback']) });

/**
 * A message from the graph webview, which is a trust boundary. Unknown keys are stripped; whether a package name or a
 * hash is current is checked by the session against the state built at that moment.
 */
export const graphMessageSchema = discriminatedUnion('type', [
  readySchema,
  reloadSchema,
  openDetailsSchema,
  positionsSchema,
  layoutDoneSchema
]);
