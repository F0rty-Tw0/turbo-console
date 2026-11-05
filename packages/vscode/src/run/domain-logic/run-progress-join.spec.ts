import type { RunLogEvent, RunTasksMatch, TaskNode, TaskOutcome } from '@turbo-console/core';
import type { MockInstance } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RunProgressJoin } from './run-progress-join.ts';
import { RunProgress } from './run-progress.ts';
import { RunStore } from './run-store.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { ProgressOwner } from '../common/run-progress.type.ts';
import type { RunDefinition, RunRequest } from '../common/run.type.ts';
import type { FakeRunLogTail } from '../test/common/run-log-tail-fake.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';
import { fakeRunLogTail } from '../test/utils/run-log-tail-fake.spec.util.ts';
import { dependenciesOfMap, progressChangesOf } from '../test/utils/run-progress.spec.util.ts';

const BUILD_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'a#build' };

const REQUEST: RunRequest = { ...RUN_REQUEST_STUB, task: BUILD_TASK };

const DEFINITION: RunDefinition = { root: '/ws', id: 'a#build' };

const OWNER: ProgressOwner = { root: '/ws', taskId: 'a#build', launchedAt: 1000 };

const RERUN: ProgressOwner = { ...OWNER, launchedAt: 5000 };

const DEPENDENCIES = dependenciesOfMap(new Map([['a#build', ['b#build']]]));

const SEEN_B: RunLogEvent = { kind: 'seen', taskId: 'b#build' };

const B_OUTCOMES: TaskOutcome[] = [{ taskId: 'b#build', state: 'passed' }];

const B_PASSED: RunTasksMatch = { match: null, outcomes: B_OUTCOMES };

const throwingListener = (): void => {
  throw new Error('feed bug');
};

describe('FEATURE: settle a run once its log is drained and its summary is matched (spec D10)', () => {
  let runs: RunStore;
  let progress: RunProgress;
  let join: RunProgressJoin;
  let logs: string[];
  let settle: MockInstance<RunProgress['settle']>;
  let tail: FakeRunLogTail;

  const beginRun = (owner: ProgressOwner = OWNER): void => {
    runs.tryStart(REQUEST, owner.launchedAt);
    join.begin(owner, DEPENDENCIES);
  };
  const beginTailedRun = (): void => {
    beginRun();
    join.tail(OWNER, tail.handle);
    join.event(OWNER, SEEN_B);
  };
  const endRun = (exitCode: number): void => {
    runs.processEnded(DEFINITION, exitCode, 3000, OWNER.launchedAt);
  };
  const stateOfB = (): string | undefined => progress.recordsOf('/ws', 'b#build')[0]?.state;

  beforeEach(() => {
    runs = new RunStore();
    progress = new RunProgress((): number => 2000);
    logs = [];
    join = new RunProgressJoin(progress, runs, (text): void => {
      logs.push(text);
    });
    settle = vi.spyOn(progress, 'settle');
    tail = fakeRunLogTail();
  });

  describe('GIVEN a begun run of a#build with a tail, b#build seen (running)', () => {
    beforeEach(beginTailedRun);

    it('WHEN a line arrives through the join THEN b#build is running in that run', () => {
      expect(stateOfB()).toBe('running');
    });

    it('WHEN its process starts (running, matching false) THEN nothing settles', async () => {
      runs.processStarted(DEFINITION, 1500, OWNER.launchedAt);
      tail.finishDrain();

      await join.drain(OWNER);

      expect(settle).not.toHaveBeenCalled();
    });

    it('WHEN its process ends THEN b#build stays running while the match is pending', async () => {
      endRun(0);
      tail.finishDrain();

      await join.drain(OWNER);

      expect(stateOfB()).toBe('running');
      expect(settle).not.toHaveBeenCalled();
    });

    it('WHEN the match lands before the drain ends THEN b#build stays running until the drain ends, then passed', async () => {
      endRun(0);

      const draining = join.drain(OWNER);

      runs.setMatch(DEFINITION, OWNER.launchedAt, B_PASSED);

      expect(stateOfB()).toBe('running');

      tail.finishDrain();

      await draining;

      expect(stateOfB()).toBe('passed');
    });

    it('WHEN the drain ends before the match lands THEN b#build stays running until the match, then passed', async () => {
      endRun(0);
      tail.finishDrain();

      await join.drain(OWNER);

      expect(stateOfB()).toBe('running');

      runs.setMatch(DEFINITION, OWNER.launchedAt, B_PASSED);

      expect(stateOfB()).toBe('passed');
    });

    it('WHEN it is stopped and its process ends THEN it settles at the drain end with no match: b#build stopped', async () => {
      runs.requestStop(DEFINITION);
      endRun(1);
      tail.finishDrain();

      await join.drain(OWNER);

      expect(stateOfB()).toBe('stopped');
    });

    it('WHEN it settled and its entry changes again THEN it settles no second time', async () => {
      endRun(0);
      runs.setMatch(DEFINITION, OWNER.launchedAt, B_PASSED);
      tail.finishDrain();

      await join.drain(OWNER);

      runs.tryStart(REQUEST, RERUN.launchedAt);

      expect(settle).toHaveBeenCalledTimes(1);
    });
  });

  describe('GIVEN no summary matched (level 3)', () => {
    beforeEach(beginTailedRun);

    it.each([
      ['exit 0', 0, 'passed'],
      ['exit 1', 1, undefined]
    ])('WHEN the run ended with %s and drained THEN b#build is %s', async (_title, exitCode, expected) => {
      endRun(exitCode);
      runs.setMatch(DEFINITION, OWNER.launchedAt, null);
      tail.finishDrain();

      await join.drain(OWNER);

      expect(stateOfB()).toBe(expected);
    });
  });

  describe('GIVEN a begun run with no tail (the log folder could not be made, level 2)', () => {
    it('WHEN its process ends, drains and its summary lists b#build passed THEN b#build is passed', async () => {
      beginRun();
      join.event(OWNER, SEEN_B);
      endRun(0);
      runs.setMatch(DEFINITION, OWNER.launchedAt, B_PASSED);

      await join.drain(OWNER);

      expect(stateOfB()).toBe('passed');
    });
  });

  describe('GIVEN a begun run whose start fails', () => {
    beforeEach(beginTailedRun);

    it.each([
      ['it fails to start', 'failed-to-start'],
      ['it was stopped before its process started', 'stopped']
    ])('WHEN %s and is aborted THEN its tail is closed once, never drained, and the run settles', (_title, state) => {
      if (state === 'stopped') runs.requestStop(DEFINITION);

      runs.failStart(DEFINITION, 3000, OWNER.launchedAt);
      join.abort(OWNER);

      expect(tail.closes).toBe(1);
      expect(tail.drains).toBe(0);
      expect(settle).toHaveBeenCalledExactlyOnceWith(OWNER, expect.objectContaining({ state }));
    });
  });

  describe('GIVEN a run already aborted', () => {
    it('WHEN its tail is handed over late THEN the tail is closed at once and nothing settles again', () => {
      const late = fakeRunLogTail();

      beginTailedRun();
      runs.failStart(DEFINITION, 3000, OWNER.launchedAt);
      join.abort(OWNER);
      join.tail(OWNER, late.handle);

      expect(late.closes).toBe(1);
      expect(settle).toHaveBeenCalledTimes(1);
    });
  });

  describe('GIVEN a#build ended (exit 0) with its match pending, its drain FINISHED, and a rerun of a#build starts', () => {
    let changes: string[];

    beforeEach(async () => {
      beginTailedRun();
      endRun(0);
      tail.finishDrain();

      await join.drain(OWNER);

      changes = progressChangesOf(progress);
      runs.tryStart(REQUEST, RERUN.launchedAt);
    });

    it("WHEN the rerun's tryStart takes the slot THEN onDidChange fired and b#build is passed (exit 0, no outcomes) before the rerun's begin", () => {
      expect(changes).toStrictEqual(['/ws']);
      expect(stateOfB()).toBe('passed');
    });

    it('WHEN the rerun is begun THEN no record of the first owner remains (begin drops the settled run)', () => {
      join.begin(RERUN, DEPENDENCIES);

      expect(progress.recordsOf('/ws', 'b#build')).toStrictEqual([]);
    });

    it("WHEN the first run's late match arrives THEN nothing changes (setMatch drops it)", () => {
      join.begin(RERUN, DEPENDENCIES);
      runs.setMatch(DEFINITION, OWNER.launchedAt, B_PASSED);

      expect(settle).toHaveBeenCalledTimes(1);
      expect(progress.recordsOf('/ws', 'b#build')).toStrictEqual([]);
    });
  });

  describe('GIVEN a#build ended (exit 0) with its match pending, its drain HELD, and a rerun of a#build started and begun', () => {
    it("WHEN the drain ends THEN the first run settles: b#build passed (exit 0, no outcomes), the rerun's begin did not drop it (unsettled then)", async () => {
      beginTailedRun();
      endRun(0);

      const draining = join.drain(OWNER);

      beginRun(RERUN);
      tail.finishDrain();

      await draining;

      expect(stateOfB()).toBe('passed');
    });
  });

  describe('GIVEN a#build whose match landed, its drain HELD, and a rerun of a#build started and begun', () => {
    it('WHEN the drain ends THEN the first run settles from its latched entry, with b#build passed', async () => {
      beginTailedRun();
      endRun(0);
      runs.setMatch(DEFINITION, OWNER.launchedAt, B_PASSED);

      const draining = join.drain(OWNER);

      beginRun(RERUN);
      tail.finishDrain();

      await draining;

      expect(stateOfB()).toBe('passed');
      expect(settle).toHaveBeenCalledExactlyOnceWith(OWNER, expect.objectContaining({ launchedAt: OWNER.launchedAt }));
    });
  });

  describe('GIVEN a progress listener that throws (U7e2 feed bug)', () => {
    it('WHEN a begun run is aborted THEN abort does not throw and one line with the error is logged', () => {
      beginTailedRun();
      runs.failStart(DEFINITION, 3000, OWNER.launchedAt);
      progress.onDidChange(throwingListener);

      expect(() => {
        join.abort(OWNER);
      }).not.toThrow();
      expect(logs).toStrictEqual([expect.stringContaining('feed bug')]);
    });

    it("WHEN a rerun's tryStart settles the first run THEN tryStart does not throw and one line is logged", async () => {
      beginTailedRun();
      endRun(0);
      tail.finishDrain();

      await join.drain(OWNER);

      progress.onDidChange(throwingListener);

      expect(() => runs.tryStart(REQUEST, RERUN.launchedAt)).not.toThrow();
      expect(logs).toStrictEqual([expect.stringContaining('feed bug')]);
    });
  });
});
