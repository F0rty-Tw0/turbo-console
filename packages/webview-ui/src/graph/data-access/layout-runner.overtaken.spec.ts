import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLayoutRunner } from './layout-runner.ts';
import { FALLBACK_TIMEOUT_MS } from '../common/graph.const.ts';
import type { ElkLike, LayoutResult, LayoutRunnerDeps } from '../common/layout.type.ts';
import type { ElkMock } from '../test/common/elk-mock.type.ts';
import { elkMock, fallbackMock, serialElkMock } from '../test/mocks/elk.mock.ts';
import { CENTRES_STUB, ELK_GRAPH_STUB, FALLBACK_POSITIONS_STUB, LAID_OUT_STUB } from '../test/stubs/layout.stub.ts';
import { runnerDepsOf } from '../test/utils/layout-runner.spec.util.ts';

/** Past half the timeout, so two jobs in a row on one ELK outlast it. */
const JOB_MS = 3000;

describe('FEATURE: createLayoutRunner, a run overtaken by a newer one', () => {
  beforeEach((): void => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  });

  afterEach((): void => {
    vi.useRealTimers();
  });

  describe('GIVEN a newer run starts a second after the first', () => {
    let fallback: Mock<LayoutRunnerDeps['fallback']>;
    let createElk: Mock<() => ElkLike>;
    let firstElk: ElkMock;
    let secondElk: ElkMock;
    let first: Promise<LayoutResult | null>;
    let second: Promise<LayoutResult | null>;

    beforeEach((): void => {
      fallback = fallbackMock(FALLBACK_POSITIONS_STUB);
      firstElk = elkMock();
      secondElk = elkMock();
      createElk = vi.fn<() => ElkLike>().mockReturnValueOnce(firstElk.elk).mockReturnValueOnce(secondElk.elk);

      const runner = createLayoutRunner(runnerDepsOf(createElk, fallback));

      first = runner.run('h1', ELK_GRAPH_STUB);
      vi.advanceTimersByTime(1000);
      second = runner.run('h2', ELK_GRAPH_STUB);
    });

    it('WHEN it starts THEN the first ELK is terminated once and a fresh one lays it out', () => {
      expect(firstElk.terminate).toHaveBeenCalledOnce();
      expect(createElk).toHaveBeenCalledTimes(2);
      expect(secondElk.layout).toHaveBeenCalledOnce();
    });

    it('WHEN the first layout resolves THEN the first run resolves null', async () => {
      firstElk.resolveLayout(LAID_OUT_STUB);

      await expect(first).resolves.toBeNull();
    });

    it('WHEN both layouts resolve THEN the second run resolves with its own result', async () => {
      firstElk.resolveLayout(LAID_OUT_STUB);
      secondElk.resolveLayout(LAID_OUT_STUB);

      await expect(second).resolves.toMatchObject({ hash: 'h2', positions: CENTRES_STUB, engine: 'elk' });
    });

    it('WHEN the first layout rejects THEN the first run resolves null', async () => {
      firstElk.rejectLayout(new Error('bad graph'));

      await expect(first).resolves.toBeNull();
    });

    it('WHEN the first layout rejects THEN no fallback runs and the second ELK is left alone', async () => {
      firstElk.rejectLayout(new Error('bad graph'));
      await first;

      expect(fallback).not.toHaveBeenCalled();
      expect(secondElk.terminate).not.toHaveBeenCalled();
    });

    it('WHEN the first run times out THEN it resolves null', async () => {
      vi.advanceTimersByTime(FALLBACK_TIMEOUT_MS - 1000);

      await expect(first).resolves.toBeNull();
    });

    it('WHEN the first run times out THEN no fallback runs and the second ELK is left alone', async () => {
      vi.advanceTimersByTime(FALLBACK_TIMEOUT_MS - 1000);
      await first;

      expect(fallback).not.toHaveBeenCalled();
      expect(secondElk.terminate).not.toHaveBeenCalled();
    });

    it('WHEN the second run times out a second later THEN it resolves the fallback', async () => {
      vi.advanceTimersByTime(FALLBACK_TIMEOUT_MS - 1000);
      await first;
      vi.advanceTimersByTime(1000);

      await expect(second).resolves.toMatchObject({ hash: 'h2', engine: 'fallback', ms: FALLBACK_TIMEOUT_MS });
    });
  });

  describe('GIVEN an ELK that works one job at a time, each past half the timeout', () => {
    it('WHEN a second run starts while the first is in flight THEN it gets an ELK layout, not a false timeout', async () => {
      const runner = createLayoutRunner(runnerDepsOf((): ElkLike => serialElkMock(LAID_OUT_STUB, JOB_MS)));

      void runner.run('h1', ELK_GRAPH_STUB);

      const second = runner.run('h2', ELK_GRAPH_STUB);

      await vi.advanceTimersByTimeAsync(FALLBACK_TIMEOUT_MS);

      await expect(second).resolves.toMatchObject({ hash: 'h2', engine: 'elk' });
    });
  });
});
