import { basename } from 'node:path';

import type { RunTasksMatch, TaskNode } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunSession } from './run-session.ts';
import { flush } from '../../tree/test/utils/atom-load.spec.util.ts';
import type { RunPorts, RunRequest } from '../common/run.type.ts';
import { RunLogTails } from '../data-access/run-log-tails.ts';
import { ENTRY_B } from '../test/common/run-log-step.const.ts';
import type { LiveParts, LiveSession } from '../test/common/run-session-live.type.ts';
import { B_PASSED_STUB, JOIN_EVENT_STUB, JOIN_OWNER_STUB, JOIN_REQUEST_STUB } from '../test/stubs/run-progress-join.stub.ts';
import { LOG_ENV_STUB } from '../test/stubs/run.stub.ts';
import { endChangeWindow, fakeChangeWindows } from '../test/utils/run-log-change-window.spec.util.ts';
import { LIVE_DIR, LIVE_FILE, liveSessionOf } from '../test/utils/run-session-live.spec.util.ts';
import { directRequestOf } from '../utils/run-target.util.ts';

const TURBO_ARGS = ['--skip-infer', 'run', 'build', '--filter=a', '--summarize'];

const SCRIPT_TASK: TaskNode = { ...JOIN_REQUEST_STUB.task, isTurboTask: false };

const SCRIPT_REQUEST: RunRequest = { ...JOIN_REQUEST_STUB, task: SCRIPT_TASK };

const SINGLE_REQUEST: RunRequest = { ...JOIN_REQUEST_STUB, singlePackage: true };

const PARTS: LiveParts = { sessionOf: (ports) => new RunSession(ports, []), tailsOf: (ports) => new RunLogTails(ports) };

const matchesB = async (): Promise<RunTasksMatch> => Promise.resolve(B_PASSED_STUB);

const MATCHES_B: Partial<RunPorts> = { match: matchesB };

type CallRecord = {
  readonly invocationCallOrder: number[];
  readonly calls: unknown[];
};

type Called = { readonly mock: CallRecord };

const firstCallOf = (called: Called): number => called.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;

describe('FEATURE: live progress of a turbo run (spec D10)', () => {
  let h: LiveSession;

  const endRun = async (): Promise<void> => {
    h.session.processEnded(JOIN_EVENT_STUB, 0);
    await endChangeWindow();
    await flush();
  };

  beforeEach(() => {
    fakeChangeWindows();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a turbo task a#build (depends on b#build) of a monorepo root', () => {
    beforeEach(async () => {
      h = liveSessionOf(PARTS, MATCHES_B);
      await h.session.run(JOIN_REQUEST_STUB);
    });

    it("WHEN it runs THEN execute gets TURBO_LOG_FILE=.turbo/turbo-console/run-1000-ab12cd34.json and today's args", () => {
      expect(h.ports.execute).toHaveBeenCalledExactlyOnceWith(JOIN_REQUEST_STUB, TURBO_ARGS, 1000, LOG_ENV_STUB);
    });

    it('WHEN it runs THEN the run is begun, the folder made, the tail started, then turbo executed, in that order', () => {
      const calls = { begin: h.begin, prepare: h.prepare, start: h.start, execute: vi.mocked(h.ports.execute) };
      const entries = Object.entries(calls);
      const sorted = entries.toSorted(([, a], [, b]) => firstCallOf(a) - firstCallOf(b));

      expect(sorted.map(([name]) => name)).toStrictEqual(['begin', 'prepare', 'start', 'execute']);
    });

    it('WHEN it runs THEN dependenciesOf is asked once, for /ws', () => {
      expect(h.ports.dependenciesOf).toHaveBeenCalledExactlyOnceWith('/ws');
    });

    it("WHEN turbo writes a b#build line THEN b#build shows running in the session's progress", async () => {
      h.fs.write(LIVE_FILE, [ENTRY_B]);
      h.fs.emit(LIVE_DIR, basename(LIVE_FILE));
      await endChangeWindow();

      expect(h.stateOfB()).toBe('running');
    });

    it('WHEN its process ends and its summary lists b#build passed THEN b#build is passed and the log file is removed', async () => {
      await endRun();

      expect([h.stateOfB(), h.fs.removed]).toStrictEqual(['passed', [LIVE_FILE]]);
    });
  });

  // U7e1d (moved by the size split, Task 5.9 Step 0b): pass on arrival.

  describe('GIVEN a turbo task of a single-package root (OQ1)', () => {
    it('WHEN it runs THEN it gets the env and its run is begun', async () => {
      h = liveSessionOf(PARTS);
      await h.session.run(SINGLE_REQUEST);

      expect([vi.mocked(h.ports.execute).mock.calls[0]?.[3], h.begin.mock.calls]).toStrictEqual([
        LOG_ENV_STUB,
        [[JOIN_OWNER_STUB, expect.any(Function)]]
      ]);
    });
  });

  it.each([
    ['a package script', SCRIPT_REQUEST],
    ['Run Without Turbo on a turbo task', directRequestOf(JOIN_REQUEST_STUB)]
  ])('GIVEN %s WHEN it runs THEN no begin, no folder, no tail and no env', async (_, request) => {
    h = liveSessionOf(PARTS);
    await h.session.run(request);

    const called: Called[] = [h.begin, h.prepare, h.start, vi.mocked(h.ports.execute)];
    const counts = called.map((mock) => mock.mock.calls.length);

    expect(counts).toStrictEqual([0, 0, 0, 0]);
  });

  describe('GIVEN a log folder that cannot be made (level 2)', () => {
    beforeEach(async () => {
      h = liveSessionOf(PARTS, MATCHES_B);
      h.fs.failMakeDir(new Error('EACCES'));
      await h.session.run(JOIN_REQUEST_STUB);
    });

    it('WHEN it runs THEN execute gets no env, no watcher opens, and the run is begun', () => {
      const launches = vi.mocked(h.ports.execute).mock.calls;

      expect([launches, h.fs.watchers.length, h.begin.mock.calls.length]).toStrictEqual([
        [[JOIN_REQUEST_STUB, TURBO_ARGS, 1000, undefined]],
        0,
        1
      ]);
    });

    it('WHEN its process ends and its summary lists b#build passed THEN b#build is passed by the match alone', async () => {
      await endRun();

      expect(h.stateOfB()).toBe('passed');
    });
  });
});
