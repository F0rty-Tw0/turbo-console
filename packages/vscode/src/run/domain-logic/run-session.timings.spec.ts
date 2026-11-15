import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunSession } from './run-session.ts';
import type { RunTiming } from '../../shared/common/api.type.ts';
import { RUN_TIMINGS_MAX } from '../common/run.const.ts';
import type { RunDefinition, RunEvent } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunPorts } from '../test/utils/fake-run-ports.spec.util.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const THIS_RUN: RunEvent = { definition: RUN, launchedAt: 1000 };

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
