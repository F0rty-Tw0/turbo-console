import { discriminatedUnion, literal, object, string, enum as zodEnum } from 'zod/mini';

const readySchema = object({ type: literal('ready') });

const taskSchema = object({ type: zodEnum(['run', 'stop', 'copy']), taskId: string() });

const openPackageJsonSchema = object({ type: literal('openPackageJson') });

const refreshSchema = object({ type: literal('refresh'), scope: zodEnum(['dryRun', 'root']) });

const showOutputSchema = object({ type: literal('showOutput') });

/**
 * A message from the webview, which is a trust boundary. Unknown keys are stripped, so a parsed message carries only
 * `type`, `taskId` and `scope`; whether a `taskId` belongs to the panel is checked by the caller.
 */
export const webviewMessageSchema = discriminatedUnion('type', [
  readySchema,
  taskSchema,
  openPackageJsonSchema,
  refreshSchema,
  showOutputSchema
]);
