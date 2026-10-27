import type { RunSummary } from '../../../shared/turbo/common/turbo.type.ts';

const EXECUTION = { startTime: 1_760_000_000_000, endTime: 1_760_000_004_000, exitCode: 0 };

const COUNTS = { attempted: 1, success: 1, failed: 0, cached: 0 };

const RUN_EXECUTION = { command: 'turbo run build --filter=web', ...COUNTS, ...EXECUTION };

const CACHE = { status: 'MISS' } as const;

const TASK = { taskId: 'web#build', execution: EXECUTION, cache: CACHE };

const TASKS = [TASK];

/** A finished one-task run, valid under `runSummarySchema`. */
export const RUN_SUMMARY_STUB: RunSummary = { id: 'run-a', monorepo: true, execution: RUN_EXECUTION, tasks: TASKS };
