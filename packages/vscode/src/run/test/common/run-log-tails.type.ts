import type { RunLogEvent } from '@turbo-console/core';

import type { FakeLogFs } from './run-log-fs.type.ts';
import type { RunLogListener, RunLogPorts, RunLogTail } from '../../common/run-log-tail.type.ts';

/** What the harness needs of `RunLogTails`, so a spec util builds it without importing the class. */
type TailStarter = {
  readonly start: (root: string, path: string, onEvent: RunLogListener) => RunLogTail;
};

/** A tail started by the harness and the events its listener got. */
export type StartedTail = {
  readonly tail: RunLogTail;
  readonly events: RunLogEvent[];
};

/** The tails over a fake folder; `start` collects the events of each tail it starts. */
export type TailsHarness = {
  readonly fs: FakeLogFs;
  readonly start: (root: string, path: string) => StartedTail;
};

/** Builds the tails under test from the harness's ports. */
export type TailsFactory = (ports: RunLogPorts) => TailStarter;
