import type { output } from 'zod/mini';

import type { runLogEntrySchema } from '../../shared/turbo/common/run-log.schema.ts';

export type RunLogEntry = output<typeof runLogEntrySchema>;

/** The result of one scan; `next` and the `from` it started at are indices into the scanned bytes. */
export type RunLogScan = {
  readonly entries: RunLogEntry[];
  /** The `{` of the first incomplete object, else the byte after the last complete object, else `from`. */
  readonly next: number;
  readonly invalid: number;
  /** Invalid objects before the first valid entry of this call; the file's first objects only for a scan from offset 0. */
  readonly leadingInvalid: number;
};

/** A task printed a line. */
export type SeenEvent = { readonly kind: 'seen'; readonly taskId: string };

/** A task's cache entry was replayed. */
export type CacheHitEvent = { readonly kind: 'cacheHit'; readonly taskId: string };

export type RunLogEvent = SeenEvent | CacheHitEvent;
