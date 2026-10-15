/** A run whose process has not started this long after launch ends as failed to start: a missing binary fires no process event. */
export const START_TIMEOUT_MS = 10_000;

/** `timings.runs` keeps the newest this many runs; the integration cases read the last few. */
export const RUN_TIMINGS_MAX = 100;

export const ALREADY_RUNNING_TEXT = 'Already running.';

export const START_TIMEOUT_TEXT = `turbo process did not start within ${START_TIMEOUT_MS / 1000} s`;

export const TASK_ENDED_TEXT = 'task ended before its process started';

export const START_WAIT_TEXT = `turbo process has not started after ${START_TIMEOUT_MS / 1000} s; VS Code may be waiting on a save prompt or an input`;

/** The task definition type of every run, declared in package.json `taskDefinitions`. */
export const RUN_TASK_TYPE = 'turbo-console';

export const FAILED_TO_START_TEXT = "Couldn't start turbo.";

export const SHOW_OUTPUT_ACTION = 'Show Output';

/** The id of a run all task is `*` plus the task name; a run's id always holds `#`, so the two never collide. */
export const RUN_ALL_PREFIX = '*';
