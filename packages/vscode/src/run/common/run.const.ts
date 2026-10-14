/** A run whose process has not started this long after launch ends as failed to start: a missing binary fires no process event. */
export const START_TIMEOUT_MS = 10_000;

export const ALREADY_RUNNING_TEXT = 'Already running.';

export const START_TIMEOUT_TEXT = `turbo process did not start within ${START_TIMEOUT_MS / 1000} s`;

export const TASK_ENDED_TEXT = 'task ended before its process started';
