import type { RunMatch } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunSession } from './run-session.ts';
import type { RunTiming } from '../../shared/common/api.type.ts';
import { RUN_TIMINGS_MAX } from '../common/run.const.ts';
import type { RunDefinition, RunEvent, RunPorts, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const MATCH: RunMatch = { cache: 'MISS', durationMs: 2000 };

const THIS_RUN: RunEvent = { definition: RUN, launchedAt: 1000 };

const EARLIER_RUN: RunEvent = { definition: RUN, launchedAt: 500 };

describe('FEATURE: run session, task events', () => {
  let clock: number;
  let execution: Terminable;
  let ports: RunPorts;
  let session: RunSession;

  const stateOf = (): string | undefined => session.runs.get(RUN.root, RUN.id)?.state;

  /** The binary check takes 50 ms, so a token read after it differs from the one read at launch. */
  const canExecute = async (): Promise<boolean> => {
    clock = 1050;

    return Promise.resolve(true);
  };

  beforeEach(async () => {
    const match = vi.fn().mockResolvedValue(MATCH);

    vi.useFakeTimers();
    clock = 1000;
    execution = { terminate: vi.fn() };
    ports = fakeRunPorts(execution, { now: () => clock, canExecute, match });
    session = new RunSession(ports, []);
    await session.run(RUN_REQUEST_STUB);
    clock = 1200;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('GIVEN a binary check that lets the clock move WHEN it runs THEN turbo is launched with the token read at launch', () => {
    const args = ['--skip-infer', 'run', 'build', '--filter=a', '--summarize'];

    expect(ports.execute).toHaveBeenCalledExactlyOnceWith(RUN_REQUEST_STUB, args, 1000);
  });

  describe('GIVEN a run launched at 1000', () => {
    it('WHEN its process starts THEN the start time is recorded', () => {
      session.processStarted(THIS_RUN);

      expect(session.runs.get(RUN.root, RUN.id)?.processStartedAt).toBe(1200);
    });

    it('WHEN an earlier run of the task reports its process start THEN this run records none', () => {
      session.processStarted(EARLIER_RUN);

      expect(session.runs.get(RUN.root, RUN.id)?.processStartedAt).toBeNull();
    });

    it('WHEN its process ends with 0 THEN it passed', () => {
      session.processEnded(THIS_RUN, 0);

      expect(stateOf()).toBe('passed');
    });

    it('WHEN its process ends with 0 THEN the summary of exactly this run is looked up', () => {
      const run = { task: RUN_REQUEST_STUB.task, packageName: 'a', launchedAt: 1000, endedAt: 1200, exitCode: 0 };

      session.processEnded(THIS_RUN, 0);

      expect(ports.match).toHaveBeenCalledExactlyOnceWith('/ws', run);
    });

    it('WHEN its process ends with 0 THEN the run shows its summary match once found', async () => {
      session.processEnded(THIS_RUN, 0);
      await vi.waitUntil(() => session.runs.get(RUN.root, RUN.id)?.matching === false);

      expect(session.runs.get(RUN.root, RUN.id)?.match).toStrictEqual(MATCH);
    });

    it('WHEN an earlier run of the task reports its process end THEN this run keeps running', () => {
      session.processEnded(EARLIER_RUN, 0);

      expect(stateOf()).toBe('running');
    });

    it('WHEN an earlier run of the task reports its process end THEN no summary is looked up', () => {
      session.processEnded(EARLIER_RUN, 0);

      expect(ports.match).not.toHaveBeenCalled();
    });

    it('WHEN its task ends with no process end THEN it failed to start', () => {
      session.taskEnded(THIS_RUN);

      expect(stateOf()).toBe('failed-to-start');
    });

    it('WHEN its task ends with no process end THEN the user is told turbo could not start', () => {
      session.taskEnded(THIS_RUN);

      expect(ports.notifyFailedToStart).toHaveBeenCalledOnce();
    });

    it('WHEN an earlier run of the task reports its task end THEN this run keeps running', () => {
      session.taskEnded(EARLIER_RUN);

      expect(stateOf()).toBe('running');
    });

    it('WHEN an earlier run of the task reports its task end THEN nothing is told', () => {
      session.taskEnded(EARLIER_RUN);

      expect(ports.notifyFailedToStart).not.toHaveBeenCalled();
    });

    it('WHEN it is stopped THEN its execution is terminated', () => {
      session.stop(RUN);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN it is stopped and its process ends with no exit code THEN it is stopped', () => {
      session.stop(RUN);
      session.processEnded(THIS_RUN, undefined);

      expect(stateOf()).toBe('stopped');
    });

    it('WHEN its process ends and a change listener throws on the match THEN the failure is logged', async () => {
      session.processEnded(THIS_RUN, 0);
      session.runs.onDidChange(() => {
        throw new Error('listener');
      });
      await vi.waitUntil(() => vi.mocked(ports.log).mock.calls.length > 0);

      expect(ports.log).toHaveBeenCalledExactlyOnceWith('listener');
    });
  });
});

describe('FEATURE: run session, timings', () => {
  let clock: number;
  let timings: RunTiming[];
  let session: RunSession;

  beforeEach(async () => {
    vi.useFakeTimers();
    clock = 1000;
    timings = [];
    session = new RunSession(fakeRunPorts({ terminate: vi.fn() }, { now: () => clock }), timings);
    await session.run(RUN_REQUEST_STUB);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a run launched at 1000', () => {
    it('WHEN nothing else happened THEN one timing holds its click and no process start', () => {
      const launched: RunTiming = { taskId: 'build', clickedAt: 1000, processStartedAt: null };

      expect(timings).toStrictEqual([launched]);
    });

    it('WHEN its process starts at 1150 THEN its timing holds that start', () => {
      const started: RunTiming = { taskId: 'build', clickedAt: 1000, processStartedAt: 1150 };

      clock = 1150;
      session.processStarted(THIS_RUN);

      expect(timings).toStrictEqual([started]);
    });

    it('WHEN it is run again while running THEN no timing is added', async () => {
      await session.run(RUN_REQUEST_STUB);

      expect(timings).toHaveLength(1);
    });

    it('WHEN it ended and a second run launched at 3000 THEN the second run gets a timing of its own', async () => {
      const second: RunTiming = { taskId: 'build', clickedAt: 3000, processStartedAt: null };

      session.processEnded(THIS_RUN, undefined);
      clock = 3000;
      await session.run(RUN_REQUEST_STUB);

      expect(timings[1]).toStrictEqual(second);
    });

    it('WHEN 100 more runs followed, 1000 ms apart THEN only the newest 100 timings are kept', async () => {
      const newest = Array.from({ length: RUN_TIMINGS_MAX }, (_, index) => 2000 + index * 1000);

      for (let run = 0; run < RUN_TIMINGS_MAX; run += 1) {
        const current: RunEvent = { definition: RUN, launchedAt: clock };

        session.processEnded(current, undefined);
        clock += 1000;
        await session.run(RUN_REQUEST_STUB);
      }

      const clicks = timings.map((timing) => timing.clickedAt);

      expect(clicks).toStrictEqual(newest);
    });
  });
});
