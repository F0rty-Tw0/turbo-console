import { join } from 'node:path';

import { vi } from 'vitest';

import { fakeRunPorts } from './fake-run-ports.spec.util.ts';
import { fakeLogFs } from './run-log-fs.spec.util.ts';
import { dependenciesOfMap } from './run-progress.spec.util.ts';
import type { RunLogListener, RunLogPorts, RunLogs } from '../../common/run-log-tail.type.ts';
import type { RunPorts } from '../../common/run.type.ts';
import { runLogDirOf } from '../../utils/run-log-dir.util.ts';
import type { LiveParts, LiveSession } from '../common/run-session-live.type.ts';
import { JOIN_DEPENDENCIES_STUB } from '../stubs/run-progress-join.stub.ts';

/** The folder and the file of the run of `/ws` launched at 1000, with the fake random id. */
export const LIVE_DIR = runLogDirOf('/ws');

export const LIVE_FILE = join(LIVE_DIR, 'run-1000-ab12cd34.json');

/** `overrides` replace run ports, `logOverrides` ports of the fake log fs under the real tails. */
export const liveSessionOf = (
  parts: LiveParts,
  overrides: Partial<RunPorts> = {},
  logOverrides: Partial<RunLogPorts> = {}
): LiveSession => {
  const fs = fakeLogFs();
  const tails = parts.tailsOf({ ...fs.ports, ...logOverrides });
  const prepare = vi.fn(async (root: string) => tails.prepare(root));
  const start = vi.fn((root: string, path: string, onEvent: RunLogListener) => tails.start(root, path, onEvent));
  const logs: RunLogs = { prepare, start };
  const dependenciesOf = vi.fn(() => dependenciesOfMap(JOIN_DEPENDENCIES_STUB));
  const ports = fakeRunPorts({ terminate: vi.fn() }, { logs, dependenciesOf, ...overrides });
  const session = parts.sessionOf(ports);
  const begin = vi.spyOn(session.progress, 'begin');
  const settle = vi.spyOn(session.progress, 'settle');
  const stateOfB = (): string | undefined => session.progress.recordsOf('/ws', 'b#build')[0]?.state;
  const live: LiveSession = { session, ports, fs, prepare, start, begin, settle, stateOfB };

  return live;
};
