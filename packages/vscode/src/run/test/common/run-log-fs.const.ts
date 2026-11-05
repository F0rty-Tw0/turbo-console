import type { RunLogEvent } from '@turbo-console/core';

import { FAKE_RUN_ID } from './run-log-id.const.ts';
import { RUN_LOG_READ_MAX } from '../../common/run-log-tail.const.ts';

export const LOG_PATH = `/ws/.turbo/turbo-console/run-1-${FAKE_RUN_ID}.json`;

export const ENTRY_TURBO = '{"source":"turbo","level":"info","timestamp":1,"text":"Running build"}';

export const ENTRY_CACHE_HIT = '{"source":"a#build","level":"info","timestamp":1,"text":"cache hit, replaying logs 0123"}';

/** An open object longer than one read window. */
export const OVERSIZE_OBJECT_SIZE = 2 * RUN_LOG_READ_MAX;

/** Windows a 2 MiB open object, its newline and the next line need: two skipped, one that ends the line, one to spare. */
export const OVERSIZE_READS_MAX = 4;

/** Entries of about 1 KiB each: 2.5 MiB, three read windows. */
export const ENTRY_COUNT_MULTI_WINDOW = 2500;

export const ENTRY_TEXT_SIZE = 1000;

export const SEEN_A: RunLogEvent = { kind: 'seen', taskId: 'a#build' };

export const SEEN_B: RunLogEvent = { kind: 'seen', taskId: 'b#build' };

export const CACHE_HIT_A: RunLogEvent = { kind: 'cacheHit', taskId: 'a#build' };
