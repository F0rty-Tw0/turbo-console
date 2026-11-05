import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunSession } from './run-session.ts';
import { flush } from '../../tree/test/utils/atom-load.spec.util.ts';
import type { RunLogPorts } from '../common/run-log-tail.type.ts';
import { START_TIMEOUT_MS } from '../common/run.const.ts';
import type { RunPorts, Terminable } from '../common/run.type.ts';
import { RunLogTails } from '../data-access/run-log-tails.ts';
import type { LiveParts, LiveSession } from '../test/common/run-session-live.type.ts';
import { JOIN_DEFINITION_STUB, JOIN_EVENT_STUB, JOIN_OWNER_STUB, JOIN_REQUEST_STUB } from '../test/stubs/run-progress-join.stub.ts';
import { endChangeWindow, fakeChangeWindows } from '../test/utils/run-log-change-window.spec.util.ts';
import { LIVE_FILE, liveSessionOf } from '../test/utils/run-session-live.spec.util.ts';

const TURBO_ARGS = ['--skip-infer', 'run', 'build', '--filter=a', '--summarize'];

const PARTS: LiveParts = { sessionOf: (ports) => new RunSession(ports, []), tailsOf: (ports) => new RunLogTails(ports) };

const neverLaunches = async (): Promise<Terminable> => Promise.withResolvers<Terminable>().promise;

const launchRejects = async (): Promise<Terminable> => Promise.reject(new Error('no workspace folder'));

const NEVER_LAUNCHES: Partial<RunPorts> = { execute: neverLaunches };

const LAUNCH_REJECTS: Partial<RunPorts> = { execute: launchRejects };

const taskEnds = async (): Promise<LiveSession> => {
  const live = liveSessionOf(PARTS);

  await live.session.run(JOIN_REQUEST_STUB);
  live.session.taskEnded(JOIN_EVENT_STUB);

  return live;
};

const timesOut = async (): Promise<LiveSession> => {
  const live = liveSessionOf(PARTS, NEVER_LAUNCHES);

  void live.session.run(JOIN_REQUEST_STUB);
  await flush();
  vi.advanceTimersByTime(START_TIMEOUT_MS);

  return live;
};

const rejects = async (): Promise<LiveSession> => {
  const live = liveSessionOf(PARTS, LAUNCH_REJECTS);

  await live.session.run(JOIN_REQUEST_STUB);

  return live;
};

const stoppedFirst = async (): Promise<LiveSession> => {
  const live = liveSessionOf(PARTS);

  await live.session.run(JOIN_REQUEST_STUB);
  live.session.stop(JOIN_DEFINITION_STUB);
  live.session.taskEnded(JOIN_EVENT_STUB);

  return live;
};

describe('FEATURE: live progress of a turbo run that ends early or reruns (spec D10, §5.3)', () => {
  let h: LiveSession;

  const settledOwners = (): unknown[] => h.settle.mock.calls.map(([owner]) => owner);

  beforeEach(() => {
    fakeChangeWindows();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a turbo run whose start fails', () => {
    it.each([
      ['its task ends before its process starts', taskEnds],
      ['the start timeout fires before the launch settles', timesOut],
      ['the launch rejects', rejects],
      ['it is stopped before its process starts, then its task ends', stoppedFirst]
    ])('WHEN %s THEN its tail is closed once, the /ws watcher closes, no D6 line is logged, and the run settles', async (_, fail) => {
      h = await fail();
      await endChangeWindow();

      const closed = h.fs.watchers.map((watcher) => watcher.closed);

      expect([h.fs.removed, closed, h.fs.logs, settledOwners()]).toStrictEqual([[LIVE_FILE], [true], [], [JOIN_OWNER_STUB]]);
    });
  });

  describe('GIVEN the start timeout fires while the log folder is being made (deferred makeDir)', () => {
    it('WHEN the folder is made after THEN no tail and no watcher start, and execute gets no env', async () => {
      const made = Promise.withResolvers<undefined>();

      const slowFolder: Partial<RunLogPorts> = { makeDir: async () => made.promise };

      h = liveSessionOf(PARTS, {}, slowFolder);

      const running = h.session.run(JOIN_REQUEST_STUB);

      await flush();
      vi.advanceTimersByTime(START_TIMEOUT_MS);
      made.resolve(undefined);
      await running;

      const launches = vi.mocked(h.ports.execute).mock.calls;

      expect([h.start.mock.calls.length, h.fs.watchers.length, launches]).toStrictEqual([
        0,
        0,
        [[JOIN_REQUEST_STUB, TURBO_ARGS, 1000, undefined]]
      ]);
    });
  });

  describe('GIVEN canExecute pending (deferred) when the start timeout fires', () => {
    it('WHEN the start timeout fires THEN the run was begun and settles, and no tail starts once canExecute resolves', async () => {
      const check = Promise.withResolvers<boolean>();

      const slowCheck: Partial<RunPorts> = { canExecute: async () => check.promise };

      h = liveSessionOf(PARTS, slowCheck);

      const running = h.session.run(JOIN_REQUEST_STUB);

      vi.advanceTimersByTime(START_TIMEOUT_MS);
      check.resolve(true);
      await running;

      expect([settledOwners(), h.start.mock.calls.length]).toStrictEqual([[JOIN_OWNER_STUB], 0]);
    });
  });

  // U7e1d (moved by the size split, Task 5.9 Step 0b): pass on arrival.
});
