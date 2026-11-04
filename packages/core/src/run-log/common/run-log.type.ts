import type { output } from 'zod/mini';

import type { runLogEntrySchema } from '../../shared/turbo/common/run-log.schema.ts';

export type RunLogEntry = output<typeof runLogEntrySchema>;

/** The result of one scan; `next` and the `from` it started at are indices into the scanned bytes. */
export type RunLogScan = {
  readonly entries: RunLogEntry[];
  readonly next: number;
  readonly invalid: number;
  readonly leadingInvalid: number;
};
