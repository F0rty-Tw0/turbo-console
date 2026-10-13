import type { TaskNode } from '../../workspace/common/workspace-model.type.ts';

/** One run of one task of one package, as the caller launched it: the process window and its exit code. */
export type RunToMatch = {
  readonly task: TaskNode;
  readonly packageName: string;
  readonly launchedAt: number;
  readonly endedAt: number;
  readonly exitCode: number;
};

/** What the run summary of one run says: `cache` is null for a task turbo never records on its own. */
export type RunMatch = {
  readonly cache: 'HIT' | 'MISS' | null;
  readonly durationMs: number;
};
