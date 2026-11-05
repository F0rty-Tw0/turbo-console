import type { Mock, MockInstance } from 'vitest';

import type { FakeLogFs } from './run-log-fs.type.ts';
import type { RunLogPorts, RunLogs } from '../../common/run-log-tail.type.ts';
import type { ProgressChanges, ProgressRecord, ProgressRuns } from '../../common/run-progress.type.ts';
import type { RunControl, RunPorts } from '../../common/run.type.ts';

type ProgressReads = {
  readonly recordsOf: (root: string, taskId: string) => ProgressRecord[];
};

type SessionProgress = {
  readonly progress: ProgressRuns & ProgressChanges & ProgressReads;
};

/** What the harness needs of `RunSession`, so a spec util builds it without importing the class. */
type LiveRunSession = RunControl & SessionProgress;

/** Builds the session and the tails under test, so a spec util needs neither class. */
export type LiveParts = {
  readonly sessionOf: (ports: RunPorts) => LiveRunSession;
  readonly tailsOf: (ports: RunLogPorts) => RunLogs;
};

/**
 * A real session over fake run ports whose `logs` are real tails over the fake log fs, both spied on; `begin` and
 * `settle` spy on the session's own progress; `stateOfB` is b#build's state in its first record of `/ws`.
 */
export type LiveSession = {
  readonly session: LiveRunSession;
  readonly ports: RunPorts;
  readonly fs: FakeLogFs;
  readonly prepare: Mock<RunLogs['prepare']>;
  readonly start: Mock<RunLogs['start']>;
  readonly begin: MockInstance<ProgressRuns['begin']>;
  readonly settle: MockInstance<ProgressRuns['settle']>;
  readonly stateOfB: () => string | undefined;
};
