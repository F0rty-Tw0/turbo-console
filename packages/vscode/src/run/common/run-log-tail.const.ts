import { RUN_LOG_OBJECT_MAX } from '@turbo-console/core';

import type { RunLogCursor, RunLogOutcome } from './run-log-tail.type.ts';

/** One read window; equal to the object cap, so an open object that fills a window is oversize. */
export const RUN_LOG_READ_MAX = RUN_LOG_OBJECT_MAX;

export const RUN_LOG_START: RunLogCursor = { offset: 0, skipping: false, leadingInvalid: 0, hasEntry: false };

/** Where turbo writes its log files under a root (spec D6). */
export const RUN_LOG_DIR_PARTS: string[] = ['.turbo', 'turbo-console'];

export const RUN_LOG_FILE_PATTERN = /^run-.*\.json$/;

export const RUN_LOG_SWEEP_AGE_MS = 86_400_000;

export const RUN_LOG_MISSING_TEXT = 'turbo wrote no log file: live progress is off for this turbo version';

export const RUN_LOG_UNKNOWN_TEXT =
  'turbo log file is in a format this version does not read: live progress is off until the run ends';

export const RUN_LOG_FAILED_TEXT = "could not read turbo's log file: live progress stopped for this run";

/** The once-per-session line of a drained file, by outcome; a file read to its end logs nothing. */
export const RUN_LOG_OUTCOME_TEXTS: Readonly<Partial<Record<RunLogOutcome, string>>> = {
  missing: RUN_LOG_MISSING_TEXT,
  unknown: RUN_LOG_UNKNOWN_TEXT,
  failed: RUN_LOG_FAILED_TEXT
};
