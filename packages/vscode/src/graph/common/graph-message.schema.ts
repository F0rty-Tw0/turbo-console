import { MANIFEST_LINE_MAX } from '@turbo-console/webview-ui';
import {
  boolean,
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

import { EXPORT_PNG_MAX, GRAPH_HASH_PATTERN, LAYOUT_MS_MAX, PACKAGE_NAME_MAX, TASK_ID_MAX } from './graph.const.ts';

/** Base64 characters only, with no `data:` prefix. */
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

const packageNameSchema = string().check(maxLength(PACKAGE_NAME_MAX));

const taskIdSchema = string().check(maxLength(TASK_ID_MAX));

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

const exportImageSchema = object({
  type: literal('exportImage'),
  png: string().check(maxLength(EXPORT_PNG_MAX, { abort: true }), regex(BASE64_PATTERN))
});

const runTaskSchema = object({ type: literal('runTask'), taskId: taskIdSchema, noCache: boolean() });

const stopTaskSchema = object({ type: literal('stopTask'), taskId: taskIdSchema });

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
  openManifestSchema,
  exportImageSchema,
  runTaskSchema,
  stopTaskSchema
]);
