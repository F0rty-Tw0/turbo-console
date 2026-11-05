import { RUN_LOG_OBJECT_MAX } from '@turbo-console/core';

import type { RunLogCursor, RunLogOutcome } from './run-log-tail.type.ts';

/** One read window; equal to the object cap, so an open object that fills a window is oversize. */
export const RUN_LOG_READ_MAX = RUN_LOG_OBJECT_MAX;

/**
 * The change window: how long a tail gathers watch events before it reads, one frame at 60 Hz, so the delay stays below
 * what a progress view shows. The folder watcher fires about once per line turbo writes; at 1 000 lines/s the window
 * cuts reads per 3 000 lines from 2 993 to 179 (U7d3 perf review). A tail's first read waits one window too.
 */
export const RUN_LOG_CHANGE_WINDOW_MS = 16;

export const RUN_LOG_START: RunLogCursor = { offset: 0, skipping: false, leadingInvalid: 0, hasEntry: false };

/** Where turbo writes its log files under a root (spec D6). */
export const RUN_LOG_DIR_PARTS: string[] = ['.turbo', 'turbo-console'];

export const RUN_LOG_FILE_PATTERN = /^run-.*\.json$/;

/** Hex characters of the random id in a log file name: two windows launching in one millisecond get two files. */
export const RUN_LOG_ID_LENGTH = 8;

export const RUN_LOG_SWEEP_AGE_MS = 86_400_000;

/**
 * A missing file, or a file a scanner or indexer holds for a moment (Windows EPERM/EBUSY), or a full handle table:
 * reading again on the next change can succeed, so one of these must not end a run's live progress.
 */
export const RUN_LOG_RETRYABLE_READ_CODES: ReadonlySet<unknown> = new Set(['ENOENT', 'EBUSY', 'EPERM', 'EMFILE', 'ENFILE', 'EAGAIN']);

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
