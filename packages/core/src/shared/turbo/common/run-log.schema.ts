import { number, object, string } from 'zod/mini';

/** One entry of turbo's structured log (`--log-file` / `TURBO_LOG_FILE`): a JSON array of these. Unknown keys are stripped. */
export const runLogEntrySchema = object({ timestamp: number(), source: string(), level: string(), text: string() });
