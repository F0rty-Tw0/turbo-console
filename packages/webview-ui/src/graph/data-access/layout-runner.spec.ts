import type { ElkNode } from 'elkjs/lib/elk-api.js';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLayoutRunner } from './layout-runner.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { FALLBACK_TIMEOUT_MS } from '../common/graph.const.ts';
import type { ElkLike, LayoutResult, LayoutRunner, LayoutRunnerDeps } from '../common/layout.type.ts';
import type { ElkMock } from '../test/common/elk-mock.type.ts';
import { elkMock, fallbackMock } from '../test/mocks/elk.mock.ts';

const APP: ElkNode = { id: 'app', width: 100, height: 32 };
const LAID_OUT_APP: ElkNode = { ...APP, x: 10, y: 20 };
const GRAPH: ElkNode = { id: 'root', children: [APP], edges: [] };
const LAID_OUT: ElkNode = { id: 'root', children: [LAID_OUT_APP], edges: [] };
const APP_CENTRE: Position = { x: 60, y: 36 };
const CENTRES: Positions = { app: APP_CENTRE };
const FALLBACK_APP: Position = { x: 1, y: 2 };
const FALLBACK_POSITIONS: Positions = { app: FALLBACK_APP };

const runnerOf = (
  createElk: () => ElkLike,
  fallback: LayoutRunnerDeps['fallback'] = fallbackMock(FALLBACK_POSITIONS)
): LayoutRunner => {
  const deps: LayoutRunnerDeps = { createElk, timeoutMs: FALLBACK_TIMEOUT_MS, fallback };

  return createLayoutRunner(deps);
};

describe('FEATURE: createLayoutRunner', () => {
  let mock: ElkMock;

  beforeEach((): void => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    mock = elkMock();
  });

  afterEach((): void => {
    vi.useRealTimers();
  });

  describe('GIVEN a healthy ELK', () => {
    it('WHEN a layout resolves THEN the result holds centres, the hash, engine elk and the elapsed ms', async () => {
      const runner = runnerOf(() => mock.elk);

      const pending = runner.run('h1', GRAPH);

      vi.advanceTimersByTime(40);
      mock.resolveLayout(LAID_OUT);

      await expect(pending).resolves.toStrictEqual({ hash: 'h1', positions: CENTRES, engine: 'elk', ms: 40 });
    });

    it('WHEN two runs settle in turn THEN one ELK instance serves both', async () => {
      const createElk = vi.fn<() => ElkLike>(() => mock.elk);
      const runner = runnerOf(createElk);

      const first = runner.run('h1', GRAPH);

      mock.resolveLayout(LAID_OUT);
      await first;

      const second = runner.run('h2', GRAPH);

      mock.resolveLayout(LAID_OUT);
      await second;

      expect(createElk).toHaveBeenCalledOnce();
    });

    it('WHEN a layout resolves THEN no timer is left', async () => {
      const runner = runnerOf(() => mock.elk);

      const pending = runner.run('h1', GRAPH);

      mock.resolveLayout(LAID_OUT);
      await pending;

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('GIVEN createElk throws on its first call', () => {
    let createElk: Mock<() => ElkLike>;

    beforeEach((): void => {
      const refuse = (): ElkLike => {
        throw new Error('Trusted Types policy tc-elk is unavailable');
      };

      createElk = vi.fn<() => ElkLike>(() => mock.elk).mockImplementationOnce(refuse);
    });

    it('WHEN a run starts THEN the result is the fallback', async () => {
      const runner = runnerOf(createElk);

      const result = await runner.run('h1', GRAPH);

      expect(result).toMatchObject({ hash: 'h1', engine: 'fallback', positions: FALLBACK_POSITIONS });
    });

    it('WHEN a run starts THEN the fallback lays out the given graph', async () => {
      const fallback = fallbackMock(FALLBACK_POSITIONS);
      const runner = runnerOf(createElk, fallback);

      await runner.run('h1', GRAPH);

      expect(fallback).toHaveBeenCalledWith(GRAPH);
    });

    it('WHEN a second run starts THEN a fresh ELK lays it out', async () => {
      const runner = runnerOf(createElk);

      await runner.run('h1', GRAPH);

      const second = runner.run('h2', GRAPH);

      mock.resolveLayout(LAID_OUT);

      const result = await second;

      expect(result?.engine).toBe('elk');
      expect(createElk).toHaveBeenCalledTimes(2);
    });
  });

  describe.each([
    ['the worker fires an error event', (elk: ElkMock): void => elk.fireError('boom')],
    ['the layout rejects', (elk: ElkMock): void => elk.rejectLayout(new Error('bad graph'))],
    [
      'no layout settles within the timeout',
      (): void => {
        vi.advanceTimersByTime(FALLBACK_TIMEOUT_MS);
      }
    ]
  ])('GIVEN %s during the current run', (_title, fail) => {
    let createElk: Mock<() => ElkLike>;
    let runner: LayoutRunner;
    let pending: Promise<LayoutResult | null>;

    beforeEach((): void => {
      createElk = vi.fn<() => ElkLike>(() => mock.elk);
      runner = runnerOf(createElk);
      pending = runner.run('h1', GRAPH);
      fail(mock);
    });

    it('THEN the result is the fallback', async () => {
      const result = await pending;

      expect(result).toMatchObject({ hash: 'h1', engine: 'fallback', positions: FALLBACK_POSITIONS });
    });

    it('THEN the worker is terminated once', async () => {
      await pending;

      expect(mock.terminate).toHaveBeenCalledOnce();
    });

    it('THEN no timer is left', async () => {
      await pending;

      expect(vi.getTimerCount()).toBe(0);
    });

    it('WHEN the next run starts THEN a fresh ELK is created', async () => {
      await pending;

      void runner.run('h2', GRAPH);

      expect(createElk).toHaveBeenCalledTimes(2);
    });

    it('WHEN the old layout resolves late THEN the settled result stays the fallback', async () => {
      await pending;

      mock.resolveLayout(LAID_OUT);

      await expect(pending).resolves.toMatchObject({ engine: 'fallback' });
    });
  });

  describe('GIVEN a newer run starts before the first settles', () => {
    let fallback: Mock<LayoutRunnerDeps['fallback']>;
    let first: Promise<LayoutResult | null>;
    let second: Promise<LayoutResult | null>;

    beforeEach((): void => {
      fallback = fallbackMock(FALLBACK_POSITIONS);

      const runner = runnerOf(() => mock.elk, fallback);

      first = runner.run('h1', GRAPH);
      vi.advanceTimersByTime(1000);
      second = runner.run('h2', GRAPH);
    });

    it('WHEN the first layout resolves THEN the first run resolves null', async () => {
      mock.resolveLayout(LAID_OUT);

      await expect(first).resolves.toBeNull();
    });

    it('WHEN both layouts resolve in turn THEN the second run resolves with its own result', async () => {
      mock.resolveLayout(LAID_OUT);
      mock.resolveLayout(LAID_OUT);

      await expect(second).resolves.toMatchObject({ hash: 'h2', positions: CENTRES, engine: 'elk' });
    });

    it('WHEN the first layout rejects THEN the first run resolves null', async () => {
      mock.rejectLayout(new Error('bad graph'));

      await expect(first).resolves.toBeNull();
    });

    it('WHEN the first layout rejects THEN neither the fallback nor terminate runs', async () => {
      mock.rejectLayout(new Error('bad graph'));
      await first;

      expect(fallback).not.toHaveBeenCalled();
      expect(mock.terminate).not.toHaveBeenCalled();
    });

    it('WHEN the first run times out THEN it resolves null', async () => {
      vi.advanceTimersByTime(FALLBACK_TIMEOUT_MS - 1000);

      await expect(first).resolves.toBeNull();
    });

    it('WHEN the first run times out THEN neither the fallback nor terminate runs', async () => {
      vi.advanceTimersByTime(FALLBACK_TIMEOUT_MS - 1000);
      await first;

      expect(fallback).not.toHaveBeenCalled();
      expect(mock.terminate).not.toHaveBeenCalled();
    });

    it('WHEN the second run times out a second later THEN it resolves the fallback', async () => {
      vi.advanceTimersByTime(FALLBACK_TIMEOUT_MS - 1000);
      await first;
      vi.advanceTimersByTime(1000);

      await expect(second).resolves.toMatchObject({ hash: 'h2', engine: 'fallback', ms: FALLBACK_TIMEOUT_MS });
    });
  });
});
