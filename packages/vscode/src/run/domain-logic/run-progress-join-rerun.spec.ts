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
  JOIN_RERUN_STUB
} from '../test/stubs/run-progress-join.stub.ts';
import { joinHarnessOf } from '../test/utils/run-progress-join.spec.util.ts';
import { progressChangesOf } from '../test/utils/run-progress.spec.util.ts';

const throwingListener = (): void => {
  throw new Error('feed bug');
};

describe('FEATURE: a rerun or a throwing listener meets a run whose join is still open (spec D10)', () => {
  let h: JoinHarness;

  beforeEach(() => {
    const runs = new RunStore();
    const progress = new RunProgress((): number => 2000);
    const logs: string[] = [];
    const join = new RunProgressJoin(progress, runs, (text): void => {
      logs.push(text);
    });

    h = joinHarnessOf({ runs, progress, join, logs });
  });

  describe('GIVEN a#build ended (exit 0) with its match pending, its drain FINISHED, and a rerun of a#build starts', () => {
    let changes: string[];

    beforeEach(async () => {
      h.beginTailedRun();
      h.endRun(0);
      h.tail.finishDrain();

      await h.join.drain(JOIN_OWNER_STUB);

      changes = progressChangesOf(h.progress);
      h.runs.tryStart(JOIN_REQUEST_STUB, JOIN_RERUN_STUB.launchedAt);
    });

    it("WHEN the rerun's tryStart takes the slot THEN onDidChange fired and b#build is passed (exit 0, no outcomes) before the rerun's begin", () => {
      expect(changes).toStrictEqual(['/ws']);
      expect(h.stateOfB()).toBe('passed');
    });

    it('WHEN the rerun is begun THEN no record of the first owner remains (begin drops the settled run)', () => {
      h.join.begin(JOIN_RERUN_STUB, h.dependenciesOf);

      expect(h.progress.recordsOf('/ws', 'b#build')).toStrictEqual([]);
    });

    it("WHEN the first run's late match arrives THEN nothing changes (setMatch drops it)", () => {
      h.join.begin(JOIN_RERUN_STUB, h.dependenciesOf);
      h.runs.setMatch(JOIN_DEFINITION_STUB, JOIN_OWNER_STUB.launchedAt, B_PASSED_STUB);

      expect(h.settle).toHaveBeenCalledTimes(1);
      expect(h.progress.recordsOf('/ws', 'b#build')).toStrictEqual([]);
    });
  });

  describe('GIVEN a#build ended (exit 0) with its match pending, its drain HELD, and a rerun of a#build started and begun', () => {
    it("WHEN the drain ends THEN the first run settles: b#build passed (exit 0, no outcomes), the rerun's begin did not drop it (unsettled then)", async () => {
      h.beginTailedRun();
      h.endRun(0);

      const draining = h.join.drain(JOIN_OWNER_STUB);

      h.beginRun(JOIN_RERUN_STUB);
      h.tail.finishDrain();

      await draining;

      expect(h.stateOfB()).toBe('passed');
    });
  });

  describe('GIVEN a#build whose match landed, its drain HELD, and a rerun of a#build started and begun', () => {
    it('WHEN the drain ends THEN the first run settles from its latched entry, with b#build passed', async () => {
      h.beginTailedRun();
      h.endRun(0);
      h.runs.setMatch(JOIN_DEFINITION_STUB, JOIN_OWNER_STUB.launchedAt, B_PASSED_STUB);

      const draining = h.join.drain(JOIN_OWNER_STUB);

      h.beginRun(JOIN_RERUN_STUB);
      h.tail.finishDrain();

      await draining;

      expect(h.stateOfB()).toBe('passed');
      expect(h.settle).toHaveBeenCalledExactlyOnceWith(
        JOIN_OWNER_STUB,
        expect.objectContaining({ launchedAt: JOIN_OWNER_STUB.launchedAt })
      );
    });
  });

  describe('GIVEN a progress listener that throws (U7e2 feed bug)', () => {
    it('WHEN a begun run is aborted THEN abort does not throw and one line with the error is logged', () => {
      h.beginTailedRun();
      h.runs.failStart(JOIN_DEFINITION_STUB, 3000, JOIN_OWNER_STUB.launchedAt);
      h.progress.onDidChange(throwingListener);

      expect(() => {
        h.join.abort(JOIN_OWNER_STUB);
      }).not.toThrow();
      expect(h.logs).toStrictEqual([expect.stringContaining('feed bug')]);
    });

    it("WHEN a rerun's tryStart settles the first run THEN tryStart does not throw and one line is logged", async () => {
      h.beginTailedRun();
      h.endRun(0);
      h.tail.finishDrain();

      await h.join.drain(JOIN_OWNER_STUB);

      h.progress.onDidChange(throwingListener);

      expect(() => h.runs.tryStart(JOIN_REQUEST_STUB, JOIN_RERUN_STUB.launchedAt)).not.toThrow();
      expect(h.logs).toStrictEqual([expect.stringContaining('feed bug')]);
    });
  });
});
