import { z } from 'zod';

const readySchema = z.object({ type: z.literal('ready') });

const taskSchema = z.object({ type: z.enum(['run', 'stop', 'copy']), taskId: z.string() });

const openPackageJsonSchema = z.object({ type: z.literal('openPackageJson') });

const refreshSchema = z.object({ type: z.literal('refresh'), scope: z.enum(['dryRun', 'root']) });

const showOutputSchema = z.object({ type: z.literal('showOutput') });

/**
 * A message from the webview, which is a trust boundary. Unknown keys are stripped, so a parsed message carries only
 * `type`, `taskId` and `scope`; whether a `taskId` belongs to the panel is checked by the caller.
 */
export const webviewMessageSchema = z.discriminatedUnion('type', [
  readySchema,
  taskSchema,
  openPackageJsonSchema,
  refreshSchema,
  showOutputSchema
]);
