import type { RunEntry } from './run.type.ts';

/** What a run settles with when `matchRunTasks` found nothing: no match and no outcomes. */
export const NOT_MATCHED: Pick<RunEntry, 'match' | 'outcomes'> = { match: null, outcomes: null };

/** A run whose process has not started this long after launch ends as failed to start: a missing binary fires no process event. */
export const START_TIMEOUT_MS = 10_000;

/** `timings.runs` keeps the newest this many runs; the integration cases read the last few. */
export const RUN_TIMINGS_MAX = 100;

export const ALREADY_RUNNING_TEXT = 'Already running.';

export const NOT_TURBO_FORCE_TEXT = 'Run Without Cache only applies to turbo tasks.';

export const TASK_ENDED_TEXT = 'task ended before its process started';

/** The variable that has turbo write its structured log to a file (spec D1). */
export const TURBO_LOG_FILE_KEY = 'TURBO_LOG_FILE';

/** The task definition type of every run, declared in package.json `taskDefinitions`. */
export const RUN_TASK_TYPE = 'turbo-console';

/** A script ended by Ctrl+C (130) or the Windows `STATUS_CONTROL_C_EXIT` (0xC000013A) was stopped, not failed. */
export const STOPPED_SCRIPT_CODES: number[] = [130, 3221225786];

/** POSIX "command not found" and cmd.exe's: the manager, or a command the script runs, is missing. */
export const NOT_FOUND_CODES: number[] = [127, 9009];

export const SHOW_OUTPUT_ACTION = 'Show Output';

/** The id of a run all task is `*` plus the task name; a run's id always holds `#`, so the two never collide. */
export const RUN_ALL_PREFIX = '*';
