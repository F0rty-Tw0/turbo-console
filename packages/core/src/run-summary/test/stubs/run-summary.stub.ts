import type { RunSummary } from '../../../shared/turbo/common/turbo.type.ts';

const EXECUTION = { startTime: 1_760_000_000_000, endTime: 1_760_000_004_000, exitCode: 0 };

const CACHE = { status: 'MISS' } as const;

const TASK = { taskId: 'web#build', execution: EXECUTION, cache: CACHE };

const TASKS = [TASK];

/** A finished one-task run, valid under `runSummarySchema`. */
export const RUN_SUMMARY_STUB: RunSummary = { id: 'run-a', execution: EXECUTION, tasks: TASKS };
