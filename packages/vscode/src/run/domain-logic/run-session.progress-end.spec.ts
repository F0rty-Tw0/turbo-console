import { basename } from 'node:path';

import type { RunTasksMatch } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunSession } from './run-session.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import { flush } from '../../tree/test/utils/atom-load.spec.util.ts';
import type { RunLogPorts } from '../common/run-log-tail.type.ts';
import { START_TIMEOUT_MS } from '../common/run.const.ts';
import type { RunPorts, Terminable } from '../common/run.type.ts';
import { RunLogTails } from '../data-access/run-log-tails.ts';
import { ENTRY_B } from '../test/common/run-log-step.const.ts';
import type { LiveParts, LiveSession } from '../test/common/run-session-live.type.ts';
import { JOIN_DEFINITION_STUB, JOIN_EVENT_STUB, JOIN_OWNER_STUB, JOIN_REQUEST_STUB } from '../test/stubs/run-progress-join.stub.ts';
import { TURBO_ARGS_STUB } from '../test/stubs/run.stub.ts';
import { endChangeWindow, fakeChangeWindows } from '../test/utils/run-log-change-window.spec.util.ts';
import { LIVE_DIR, LIVE_FILE, liveSessionOf } from '../test/utils/run-session-live.spec.util.ts';

const PARTS: LiveParts = { sessionOf: (ports) => new RunSession(ports, []), tailsOf: (ports) => new RunLogTails(ports) };

const neverLaunches = async (): Promise<Terminable> => Promise.withResolvers<Terminable>().promise;

const launchRejects = async (): Promise<Terminable> => Promise.reject(new Error('no workspace folder'));

const NO_TASKS: RootChange = { root: '/ws', before: null, after: null, errorBefore: null, errorAfter: null };

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

describe('FEATURE: live progress of a turbo run that ends early, loses its task or reruns (spec D10, §5.3)', () => {
  let live: LiveSession;

  const settledOwners = (): unknown[] => live.settle.mock.calls.map(([owner]) => owner);

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
      live = await fail();
      await endChangeWindow();

      const closed = live.fs.watchers.map((watcher) => watcher.closed);

      expect([live.fs.removed, closed, live.fs.logs, settledOwners()]).toStrictEqual([[LIVE_FILE], [true], [], [JOIN_OWNER_STUB]]);
    });
  });

  describe('GIVEN a turbo run whose dependency snapshot throws', () => {
    it('WHEN it runs THEN it ends failed to start, the reason is logged and turbo is not executed', async () => {
      const snapshotThrows: Partial<RunPorts> = {
        dependenciesOf: () => {
          throw new Error('graph boom');
        }
      };

      live = liveSessionOf(PARTS, snapshotThrows);
      await live.session.run(JOIN_REQUEST_STUB);

      const { state } = live.session.runs.get('/ws', 'a#build') ?? {};
      const logged = vi.mocked(live.ports.log).mock.calls;
      const launched = vi.mocked(live.ports.execute).mock.calls;

      expect([state, logged, launched]).toStrictEqual(['failed-to-start', [[expect.stringContaining('graph boom')]], []]);
    });
  });

  describe('GIVEN the start timeout fires while the log folder is being made (deferred makeDir)', () => {
    it('WHEN the folder is made after THEN no tail and no watcher start, and execute gets no env', async () => {
      const made = Promise.withResolvers<undefined>();

      const slowFolder: Partial<RunLogPorts> = { makeDir: async () => made.promise };

      live = liveSessionOf(PARTS, {}, slowFolder);

      const running = live.session.run(JOIN_REQUEST_STUB);

      await flush();
      vi.advanceTimersByTime(START_TIMEOUT_MS);
      made.resolve(undefined);
      await running;

      const launches = vi.mocked(live.ports.execute).mock.calls;

      expect([live.start.mock.calls.length, live.fs.watchers.length, launches]).toStrictEqual([
        0,
        0,
        [[JOIN_REQUEST_STUB, TURBO_ARGS_STUB, 1000, undefined]]
      ]);
    });
  });

  describe('GIVEN a run waiting for its log folder whose task ended, and a rerun now holding the slot', () => {
    it('WHEN the folder is made THEN only the rerun has a tail, and the earlier launch gets no env', async () => {
      const made = Promise.withResolvers<undefined>();
      const makeDir = vi.fn<RunLogPorts['makeDir']>().mockReturnValueOnce(made.promise).mockResolvedValue(undefined);
      let clock = 1000;

      live = liveSessionOf(PARTS, { now: () => clock }, { makeDir });

      const earlier = live.session.run(JOIN_REQUEST_STUB);

      await flush();
      live.session.taskEnded(JOIN_EVENT_STUB);
      clock = 2000;
      await live.session.run(JOIN_REQUEST_STUB);
      made.resolve(undefined);
      await earlier;

      const earlierLaunch = vi.mocked(live.ports.execute).mock.calls.find(([, , launchedAt]) => launchedAt === 1000);

      expect([live.start.mock.calls.length, earlierLaunch?.[3]]).toStrictEqual([1, undefined]);
    });
  });

  describe('GIVEN canExecute pending (deferred) when the start timeout fires', () => {
    it('WHEN the start timeout fires THEN the run was begun and settles, and no tail starts once canExecute resolves', async () => {
      const check = Promise.withResolvers<boolean>();

      const slowCheck: Partial<RunPorts> = { canExecute: async () => check.promise };

      live = liveSessionOf(PARTS, slowCheck);

      const running = live.session.run(JOIN_REQUEST_STUB);

      vi.advanceTimersByTime(START_TIMEOUT_MS);
      check.resolve(true);
      await running;

      expect([settledOwners(), live.start.mock.calls.length]).toStrictEqual([[JOIN_OWNER_STUB], 0]);
    });
  });

  describe('GIVEN an ended turbo run still waiting for its match', () => {
    beforeEach(async () => {
      const matching = Promise.withResolvers<RunTasksMatch | null>();
      const waitsForMatch: Partial<RunPorts> = { match: async () => matching.promise };

      live = liveSessionOf(PARTS, waitsForMatch);
      await live.session.run(JOIN_REQUEST_STUB);
      live.fs.write(LIVE_FILE, [ENTRY_B]);
      live.fs.emit(LIVE_DIR, basename(LIVE_FILE));
      await endChangeWindow();
      live.session.processEnded(JOIN_EVENT_STUB, 0);
      await endChangeWindow();
    });

    it('WHEN its task vanishes in a root change THEN its progress settles once', async () => {
      live.session.rootChanged(NO_TASKS);
      await flush();

      expect(settledOwners()).toStrictEqual([JOIN_OWNER_STUB]);
    });

    it('WHEN a run change listener throws on the root change THEN it logs one line, still prunes the progress and does not throw', () => {
      live.session.runs.onDidChange(() => {
        throw new Error('listener boom');
      });

      expect(() => {
        live.session.rootChanged(NO_TASKS);
      }).not.toThrow();
      expect([live.stateOfB(), vi.mocked(live.ports.log).mock.calls]).toStrictEqual([
        undefined,
        [[expect.stringContaining('listener boom')]]
      ]);
    });
  });

  // U7e1d (moved by the size split, Task 5.9 Step 0b): pass on arrival.
});
