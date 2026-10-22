import { MANIFEST_LINE_MAX } from '@turbo-console/webview-ui';
import {
  discriminatedUnion,
  gte,
  int,
  literal,
  lte,
  maxLength,
  number,
  object,
  regex,
  string,
  unknown,
  enum as zodEnum
} from 'zod/mini';

import { GRAPH_HASH_PATTERN, LAYOUT_MS_MAX, PACKAGE_NAME_MAX } from './graph.const.ts';

const packageNameSchema = string().check(maxLength(PACKAGE_NAME_MAX));

const readySchema = object({ type: literal('ready') });

const reloadSchema = object({ type: literal('reload') });

const openDetailsSchema = object({ type: literal('openDetails'), packageName: packageNameSchema });

const explainEdgeSchema = object({ type: literal('explainEdge'), source: packageNameSchema, target: packageNameSchema });

const openManifestSchema = object({
  type: literal('openManifest'),
  packageName: packageNameSchema,
  line: int().check(gte(0), lte(MANIFEST_LINE_MAX))
});

/**
 * `positions` passes through unread: zod's `record()` drops an own `__proto__` key, so a package named `__proto__`
 * could never be cached. `parseGraphMessage` checks the record itself.
 */
const positionsSchema = object({
  type: literal('positions'),
  hash: string().check(regex(GRAPH_HASH_PATTERN)),
  positions: unknown(),
  grouping: zodEnum(['flat', 'folders'])
});

const layoutMsSchema = number().check(gte(0), lte(LAYOUT_MS_MAX));

const layoutDoneSchema = object({ type: literal('layoutDone'), ms: layoutMsSchema, engine: zodEnum(['elk', 'fallback']) });

/**
 * A message from the graph webview, which is a trust boundary. Unknown keys are stripped; whether a package name or a
 * hash is current is checked by the session against the state built at that moment.
 */
export const graphMessageSchema = discriminatedUnion('type', [
  readySchema,
  reloadSchema,
  openDetailsSchema,
  positionsSchema,
  layoutDoneSchema,
  explainEdgeSchema,
  openManifestSchema
]);
