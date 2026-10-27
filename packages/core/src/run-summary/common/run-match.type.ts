import type { TaskNode } from '../../workspace/common/workspace-model.type.ts';

/** One run of one task of one package, as the caller launched it: the process window and its exit code. */
export type RunToMatch = {
  readonly task: TaskNode;
  readonly packageName: string;
  readonly launchedAt: number;
  readonly endedAt: number;
  readonly exitCode: number;
};

/**
 * What the run summary of one run says: `cache` is null for a task turbo never records on its own and for an
 * `interrupted` run. `interrupted`: turbo did not see every task it attempted end, or listed no task at all (Ctrl+C in
 * its terminal: turbo exits 0 with the task missing); the duration is then the whole summary's.
 */
export type RunMatch = {
  readonly cache: 'HIT' | 'MISS' | null;
  readonly durationMs: number;
  readonly interrupted: boolean;
};
