import { beforeEach, describe, expect, it } from 'vitest';

import { RunProgressJoin } from './run-progress-join.ts';
import { RunProgress } from './run-progress.ts';
import { RunStore } from './run-store.ts';
import type { JoinHarness } from '../test/common/run-progress-join-harness.type.ts';
import {
  B_PASSED_STUB,
  JOIN_DEFINITION_STUB,
  JOIN_OWNER_STUB,
  JOIN_REQUEST_STUB,
  JOIN_RERUN_STUB,
  SEEN_B_STUB
} from '../test/stubs/run-progress-join.stub.ts';
import { fakeRunLogTail } from '../test/utils/run-log-tail-fake.spec.util.ts';
import { joinHarnessOf } from '../test/utils/run-progress-join.spec.util.ts';

describe('FEATURE: settle a run once its log is drained and its summary is matched (spec D10)', () => {
  let h: JoinHarness;

  const noop = (): void => undefined;
  const stopRun = (): void => {
    h.runs.requestStop(JOIN_DEFINITION_STUB);
  };

  beforeEach(() => {
    const runs = new RunStore();
    const progress = new RunProgress((): number => 2000);
    const logs: string[] = [];
    const join = new RunProgressJoin(progress, runs, (text): void => {
      logs.push(text);
    });

    h = joinHarnessOf({ runs, progress, join, logs });
  });

  describe('GIVEN a begun run of a#build with a tail, b#build seen (running)', () => {
    beforeEach(() => {
      h.beginTailedRun();
    });

    it('WHEN a line arrives through the join THEN b#build is running in that run', () => {
      expect(h.stateOfB()).toBe('running');
    });

    it('WHEN its process starts (running, matching false) THEN nothing settles', async () => {
      h.runs.processStarted(JOIN_DEFINITION_STUB, 1500, JOIN_OWNER_STUB.launchedAt);
      h.tail.finishDrain();

      await h.join.drain(JOIN_OWNER_STUB);

      expect(h.settle).not.toHaveBeenCalled();
    });

    it('WHEN its process ends THEN b#build stays running while the match is pending', async () => {
      h.endRun(0);
      h.tail.finishDrain();

      await h.join.drain(JOIN_OWNER_STUB);

      expect(h.stateOfB()).toBe('running');
      expect(h.settle).not.toHaveBeenCalled();
    });

    it('WHEN the match lands before the drain ends THEN b#build stays running until the drain ends, then passed', async () => {
      h.endRun(0);

      const draining = h.join.drain(JOIN_OWNER_STUB);

      h.runs.setMatch(JOIN_DEFINITION_STUB, JOIN_OWNER_STUB.launchedAt, B_PASSED_STUB);

      expect(h.stateOfB()).toBe('running');

      h.tail.finishDrain();

      await draining;

      expect(h.stateOfB()).toBe('passed');
    });

    it('WHEN the drain ends before the match lands THEN b#build stays running until the match, then passed', async () => {
      h.endRun(0);
      h.tail.finishDrain();

      await h.join.drain(JOIN_OWNER_STUB);

      expect(h.stateOfB()).toBe('running');

      h.runs.setMatch(JOIN_DEFINITION_STUB, JOIN_OWNER_STUB.launchedAt, B_PASSED_STUB);

      expect(h.stateOfB()).toBe('passed');
    });

    it('WHEN it is stopped and its process ends THEN it settles at the drain end with no match: b#build stopped', async () => {
      h.runs.requestStop(JOIN_DEFINITION_STUB);
      h.endRun(1);
      h.tail.finishDrain();

      await h.join.drain(JOIN_OWNER_STUB);

      expect(h.stateOfB()).toBe('stopped');
    });

    it('WHEN it settled and its entry changes again THEN it settles no second time', async () => {
      h.endRun(0);
      h.runs.setMatch(JOIN_DEFINITION_STUB, JOIN_OWNER_STUB.launchedAt, B_PASSED_STUB);
      h.tail.finishDrain();

      await h.join.drain(JOIN_OWNER_STUB);

      h.runs.tryStart(JOIN_REQUEST_STUB, JOIN_RERUN_STUB.launchedAt);

      expect(h.settle).toHaveBeenCalledTimes(1);
    });
  });

  describe('GIVEN no summary matched (level 3)', () => {
    beforeEach(() => {
      h.beginTailedRun();
    });

    it.each([
      ['exit 0', 0, 'passed'],
      ['exit 1', 1, undefined]
    ])('WHEN the run ended with %s and drained THEN b#build is %s', async (_title, exitCode, expected) => {
      h.endRun(exitCode);
      h.runs.setMatch(JOIN_DEFINITION_STUB, JOIN_OWNER_STUB.launchedAt, null);
      h.tail.finishDrain();

      await h.join.drain(JOIN_OWNER_STUB);

      expect(h.stateOfB()).toBe(expected);
    });
  });

  describe('GIVEN a begun run with no tail (the log folder could not be made, level 2)', () => {
    it('WHEN its process ends, drains and its summary lists b#build passed THEN b#build is passed', async () => {
      h.beginRun();
      h.join.event(JOIN_OWNER_STUB, SEEN_B_STUB);
      h.endRun(0);
      h.runs.setMatch(JOIN_DEFINITION_STUB, JOIN_OWNER_STUB.launchedAt, B_PASSED_STUB);

      await h.join.drain(JOIN_OWNER_STUB);

      expect(h.stateOfB()).toBe('passed');
    });
  });

  describe('GIVEN a begun run whose start fails', () => {
    beforeEach(() => {
      h.beginTailedRun();
    });

    it.each([
      ['it fails to start', 'failed-to-start', noop],
      ['it was stopped before its process started', 'stopped', stopRun]
    ])('WHEN %s and is aborted THEN its tail is closed once, never drained, and the run settles', (_title, state, drive) => {
      drive();
      h.runs.failStart(JOIN_DEFINITION_STUB, 3000, JOIN_OWNER_STUB.launchedAt);
      h.join.abort(JOIN_OWNER_STUB);

      expect(h.tail.closes).toBe(1);
      expect(h.tail.drains).toBe(0);
      expect(h.settle).toHaveBeenCalledExactlyOnceWith(JOIN_OWNER_STUB, expect.objectContaining({ state }));
    });

    it('WHEN it is aborted before its failed start is recorded THEN nothing settles until the entry latches, then once', () => {
      h.join.abort(JOIN_OWNER_STUB);

      expect(h.settle).not.toHaveBeenCalled();

      h.runs.failStart(JOIN_DEFINITION_STUB, 3000, JOIN_OWNER_STUB.launchedAt);

      expect(h.settle).toHaveBeenCalledExactlyOnceWith(JOIN_OWNER_STUB, expect.objectContaining({ state: 'failed-to-start' }));
    });
  });

  describe('GIVEN a drain HELD and the run aborted', () => {
    it('WHEN the drain ends THEN the run stays settled once and the drain resolves', async () => {
      h.beginTailedRun();
      h.runs.failStart(JOIN_DEFINITION_STUB, 3000, JOIN_OWNER_STUB.launchedAt);

      const draining = h.join.drain(JOIN_OWNER_STUB);

      h.join.abort(JOIN_OWNER_STUB);
      h.tail.finishDrain();

      await expect(draining).resolves.toBeUndefined();
      expect(h.settle).toHaveBeenCalledTimes(1);
    });
  });

  describe('GIVEN a begun run whose tail drain rejects', () => {
    it('WHEN the drain fails THEN the run still settles once and the caller gets the error', async () => {
      h.beginTailedRun();
      h.endRun(0);
      h.runs.setMatch(JOIN_DEFINITION_STUB, JOIN_OWNER_STUB.launchedAt, null);

      const draining = h.join.drain(JOIN_OWNER_STUB);

      h.tail.failDrain(new Error('read failed'));

      await expect(draining).rejects.toThrow('read failed');
      expect(h.settle).toHaveBeenCalledExactlyOnceWith(JOIN_OWNER_STUB, expect.objectContaining({ state: 'passed' }));
    });
  });

  describe('GIVEN a run with no tail yet whose drain finished with its match pending', () => {
    it('WHEN its tail is handed over late THEN the tail is closed at once', async () => {
      const late = fakeRunLogTail();

      h.beginRun();
      h.endRun(0);

      await h.join.drain(JOIN_OWNER_STUB);

      h.join.tail(JOIN_OWNER_STUB, late.handle);

      expect(late.closes).toBe(1);
    });
  });

  describe('GIVEN a begun run that already has a tail', () => {
    it('WHEN a second tail is handed over THEN the second is closed and the first stays open', () => {
      const second = fakeRunLogTail();

      h.beginTailedRun();
      h.join.tail(JOIN_OWNER_STUB, second.handle);

      expect(second.closes).toBe(1);
      expect(h.tail.closes).toBe(0);
    });
  });

  describe('GIVEN a run already aborted', () => {
    it('WHEN its tail is handed over late THEN the tail is closed at once and nothing settles again', () => {
      const late = fakeRunLogTail();

      h.beginTailedRun();
      h.runs.failStart(JOIN_DEFINITION_STUB, 3000, JOIN_OWNER_STUB.launchedAt);
      h.join.abort(JOIN_OWNER_STUB);
      h.join.tail(JOIN_OWNER_STUB, late.handle);

      expect(late.closes).toBe(1);
      expect(h.settle).toHaveBeenCalledTimes(1);
    });
  });
});
