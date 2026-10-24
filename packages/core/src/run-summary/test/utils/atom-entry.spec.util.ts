import type { RunSummaryTask } from '../../../shared/turbo/common/turbo.type.ts';

const EXECUTION = { startTime: 1000, endTime: 1500, exitCode: 0 };

const MISS = { status: 'MISS' } as const;

const HIT = { status: 'HIT' } as const;

const MISS_ENTRY: RunSummaryTask = { taskId: 'pkg#file', execution: EXECUTION, cache: MISS };

/** A task entry over 1000-1500 ms exiting 0 with cache `status`, `execution` overriding any of those fields. */
export const entryWith = (status: 'HIT' | 'MISS', execution: Partial<RunSummaryTask['execution']>): RunSummaryTask => {
  const merged = { ...EXECUTION, ...execution };
  const cache = status === 'HIT' ? HIT : MISS;
  const entry: RunSummaryTask = { ...MISS_ENTRY, execution: merged, cache };

  return entry;
};
