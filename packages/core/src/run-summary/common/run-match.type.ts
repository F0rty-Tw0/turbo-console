import type { RunExtras } from '../../run-args/common/run-args.type.ts';
import type { TaskNode } from '../../workspace/common/workspace-model.type.ts';

/** One run of one task of one package, as the caller launched it: the process window and its exit code. */
export type RunToMatch = {
  readonly task: TaskNode;
  readonly packageName: string;
  readonly launchedAt: number;
  readonly endedAt: number;
  readonly exitCode: number;
  readonly extras?: RunExtras;
};

/**
 * What the run summary of one run says: `cache` is null for a task turbo never records on its own and for an
 * `interrupted` run. `interrupted`: the run exited 0, yet turbo did not see every task it attempted end, or listed no
 * task at all (Ctrl+C in its terminal: turbo exits 0 with the task missing); the duration is then the whole summary's.
 */
export type RunMatch = {
  readonly cache: 'HIT' | 'MISS' | null;
  readonly durationMs: number;
  readonly interrupted: boolean;
};

/** How the run summary says one task ended: a cache HIT or exit 0 passed, any other exit failed. */
export type TaskOutcome = {
  readonly taskId: string;
  readonly state: 'passed' | 'failed';
};

/**
 * What the run summary of one run says about every task it lists: one outcome per `tasks[]` entry, in its order. A task
 * turbo attempted but never saw end (Ctrl+C) has no entry and so no outcome; `outcomes` is `[]` when none ended. `match`
 * is `null` when the summary lacks the launched task's entry, as after a failed dependency.
 */
export type RunTasksMatch = {
  readonly match: RunMatch | null;
  readonly outcomes: TaskOutcome[];
};
