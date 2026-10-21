import { discriminatedUnion, literal, number, object, record, string, enum as zodEnum } from 'zod/mini';

const readySchema = object({ type: literal('ready') });

const reloadSchema = object({ type: literal('reload') });

const openDetailsSchema = object({ type: literal('openDetails'), packageName: string() });

const pointSchema = object({ x: number(), y: number() });

const positionsSchema = object({ type: literal('positions'), hash: string(), positions: record(string(), pointSchema) });

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
