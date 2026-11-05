import { join } from 'node:path';

import type { RunLogEvent } from '@turbo-console/core';

import { fakeLogFs } from './run-log-fs.spec.util.ts';
import type { RunLogPorts } from '../../common/run-log-tail.type.ts';
import { runLogDirOf } from '../../utils/run-log-dir.util.ts';
import type { StartedTail, TailsFactory, TailsHarness } from '../common/run-log-tails.type.ts';

export const logPathOf = (root: string, name: string): string => join(runLogDirOf(root), name);

/** `overrides` replace single ports of the fake, e.g. a `remove` that rejects. */
export const tailsHarnessOf = (create: TailsFactory, overrides: Partial<RunLogPorts> = {}): TailsHarness => {
  const fs = fakeLogFs();
  const ports: RunLogPorts = { ...fs.ports, ...overrides };
  const tails = create(ports);

  const start = (root: string, path: string): StartedTail => {
    const events: RunLogEvent[] = [];
    const onEvent = (event: RunLogEvent): void => {
      events.push(event);
    };
    const tail = tails.start(root, path, onEvent);
    const started: StartedTail = { tail, events };

    return started;
  };

  const harness: TailsHarness = { fs, start };

  return harness;
};
