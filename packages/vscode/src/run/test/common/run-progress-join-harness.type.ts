import type { MockInstance } from 'vitest';

import type { FakeRunLogTail } from './run-log-tail-fake.type.ts';
import type {
  DependenciesOf,
  ProgressChanges,
  ProgressOwner,
  ProgressPort,
  ProgressRecord,
  ProgressRuns
} from '../../common/run-progress.type.ts';
import type { RunDefinition, RunEntry, Runs } from '../../common/run.type.ts';

type StoreCalls = {
  readonly requestStop: (definition: RunDefinition) => void;
  readonly processStarted: (definition: RunDefinition, at: number, launchedAt?: number) => void;
  readonly processEnded: (definition: RunDefinition, exitCode: number | undefined, at: number, launchedAt?: number) => RunEntry | null;
};

type ProgressCalls = {
  readonly recordsOf: (root: string, taskId: string) => ProgressRecord[];
};

type JoinRuns = Pick<Runs, 'tryStart' | 'failStart' | 'setMatch'> & StoreCalls;

type JoinProgress = ProgressRuns & ProgressChanges & ProgressCalls;

/** The real store, progress and join of a spec, with the lines the join logged. */
export type JoinParts = {
  readonly runs: JoinRuns;
  readonly progress: JoinProgress;
  readonly join: ProgressPort;
  readonly logs: string[];
};

type HarnessHelpers = {
  readonly settle: MockInstance<ProgressRuns['settle']>;
  readonly tail: FakeRunLogTail;
  readonly dependenciesOf: DependenciesOf;
  readonly beginRun: (owner?: ProgressOwner) => void;
  readonly beginTailedRun: () => void;
  readonly endRun: (exitCode: number) => void;
  readonly stateOfB: () => string | undefined;
};

/** The parts plus a fake tail, a spy on `settle`, and the helpers that begin and end a run of a#build. */
export type JoinHarness = JoinParts & HarnessHelpers;
