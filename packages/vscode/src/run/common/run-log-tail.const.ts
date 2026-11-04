import { RUN_LOG_OBJECT_MAX } from '@turbo-console/core';

import type { RunLogCursor } from './run-log-tail.type.ts';

/** One read window; equal to the object cap, so an open object that fills a window is oversize. */
export const RUN_LOG_READ_MAX = RUN_LOG_OBJECT_MAX;

export const RUN_LOG_START: RunLogCursor = { offset: 0, skipping: false, leadingInvalid: 0, hasEntry: false };
