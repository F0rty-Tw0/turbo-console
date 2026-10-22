import type { ElkNode } from 'elkjs/lib/elk-api.js';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLayoutRunner } from './layout-runner.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { FALLBACK_TIMEOUT_MS } from '../common/graph.const.ts';
import type { ElkLike, LayoutResult, LayoutRunner } from '../common/layout.type.ts';
import type { ElkMock } from '../test/common/elk-mock.type.ts';
import { elkMock, failingFallbackMock, fallbackMock } from '../test/mocks/elk.mock.ts';
import { CENTRES_STUB, ELK_GRAPH_STUB, FALLBACK_POSITIONS_STUB, LAID_OUT_STUB } from '../test/stubs/layout.stub.ts';
import { boardsGraphOf } from '../test/utils/folder-boards.spec.util.ts';
import { runnerDepsOf } from '../test/utils/layout-runner.spec.util.ts';
import { flatElkGraphOf } from '../utils/elk-flat-graph.util.ts';

const GRID_APP: Position = { x: 0, y: 0 };
const GRID_POSITIONS: Positions = { app: GRID_APP };

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
      const runner = createLayoutRunner(runnerDepsOf(() => mock.elk));

      const pending = runner.run('h1', ELK_GRAPH_STUB);

      vi.advanceTimersByTime(40);
      mock.resolveLayout(LAID_OUT_STUB);

      await expect(pending).resolves.toStrictEqual({ hash: 'h1', positions: CENTRES_STUB, engine: 'elk', ms: 40 });
    });

    it('WHEN two runs settle in turn THEN one ELK instance serves both', async () => {
      const createElk = vi.fn<() => ElkLike>(() => mock.elk);
      const runner = createLayoutRunner(runnerDepsOf(createElk));

      const first = runner.run('h1', ELK_GRAPH_STUB);

      mock.resolveLayout(LAID_OUT_STUB);
      await first;

      const second = runner.run('h2', ELK_GRAPH_STUB);

      mock.resolveLayout(LAID_OUT_STUB);
      await second;

      expect(createElk).toHaveBeenCalledOnce();
    });

    it('WHEN a layout resolves THEN no timer is left', async () => {
      const runner = createLayoutRunner(runnerDepsOf(() => mock.elk));

      const pending = runner.run('h1', ELK_GRAPH_STUB);

      mock.resolveLayout(LAID_OUT_STUB);
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
      const runner = createLayoutRunner(runnerDepsOf(createElk));

      const result = await runner.run('h1', ELK_GRAPH_STUB);

      expect(result).toMatchObject({ hash: 'h1', engine: 'fallback', positions: FALLBACK_POSITIONS_STUB });
    });

    it('WHEN a run starts THEN the fallback lays out the given graph', async () => {
      const fallback = fallbackMock(FALLBACK_POSITIONS_STUB);
      const runner = createLayoutRunner(runnerDepsOf(createElk, fallback));

      await runner.run('h1', ELK_GRAPH_STUB);

      expect(fallback).toHaveBeenCalledWith(ELK_GRAPH_STUB);
    });

    it('WHEN a second run starts THEN a fresh ELK lays it out', async () => {
      const runner = createLayoutRunner(runnerDepsOf(createElk));

      await runner.run('h1', ELK_GRAPH_STUB);

      const second = runner.run('h2', ELK_GRAPH_STUB);

      mock.resolveLayout(LAID_OUT_STUB);

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
      runner = createLayoutRunner(runnerDepsOf(createElk));
      pending = runner.run('h1', ELK_GRAPH_STUB);
      fail(mock);
    });

    it('THEN the result is the fallback', async () => {
      const result = await pending;

      expect(result).toMatchObject({ hash: 'h1', engine: 'fallback', positions: FALLBACK_POSITIONS_STUB });
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

      void runner.run('h2', ELK_GRAPH_STUB);

      expect(createElk).toHaveBeenCalledTimes(2);
    });

    it('WHEN the old layout resolves late THEN the settled result stays the fallback', async () => {
      await pending;

      mock.resolveLayout(LAID_OUT_STUB);

      await expect(pending).resolves.toMatchObject({ engine: 'fallback' });
    });
  });

  describe('GIVEN no ELK and a fallback that throws', () => {
    it('WHEN a run starts THEN the result is the grid fallback', async () => {
      const refuse = (): ElkLike => {
        throw new Error('Trusted Types policy tc-elk is unavailable');
      };
      const runner = createLayoutRunner(runnerDepsOf(refuse, failingFallbackMock()));

      const result = await runner.run('h1', ELK_GRAPH_STUB);

      expect(result).toMatchObject({ hash: 'h1', engine: 'fallback', positions: GRID_POSITIONS });
    });
  });

  describe('GIVEN a grouped graph', () => {
    const grouped = boardsGraphOf();
    const flat = flatElkGraphOf(grouped);
    const web: ElkNode = { id: 'web', x: 10, y: 20, width: 40, height: 30 };
    const ui: ElkNode = { id: 'ui', x: 0, y: 0, width: 20, height: 20 };
    const apps: ElkNode = { id: '\u0001apps', x: 100, y: 200, children: [web] };
    const libs: ElkNode = { id: '\u0001libs', x: 300, y: 0, children: [ui] };
    const laidOut: ElkNode = { id: 'root', children: [apps, libs] };
    const webCentre: Position = { x: 130, y: 235 };
    const uiCentre: Position = { x: 310, y: 10 };
    const nestedCentres: Positions = { web: webCentre, ui: uiCentre };

    it('WHEN the layout resolves THEN the positions are the nested centres and the engine is elk', async () => {
      const runner = createLayoutRunner(runnerDepsOf(() => mock.elk));

      const pending = runner.run('h1', grouped);

      mock.resolveLayout(laidOut);

      await expect(pending).resolves.toMatchObject({ engine: 'elk', positions: nestedCentres });
    });

    it('WHEN ELK rejects THEN the fallback lays out the flattened graph', async () => {
      const fallback = fallbackMock(FALLBACK_POSITIONS_STUB);
      const runner = createLayoutRunner(runnerDepsOf(() => mock.elk, fallback));

      const pending = runner.run('h1', grouped);

      mock.rejectLayout(new Error('bad graph'));

      await expect(pending).resolves.toMatchObject({ engine: 'fallback' });
      expect(fallback).toHaveBeenCalledOnce();
      expect(fallback.mock.calls[0]?.[0]).toStrictEqual(flat);
    });

    it('WHEN createElk throws THEN the fallback lays out the flattened graph', async () => {
      const refuse = (): ElkLike => {
        throw new Error('Trusted Types policy tc-elk is unavailable');
      };
      const fallback = fallbackMock(FALLBACK_POSITIONS_STUB);
      const runner = createLayoutRunner(runnerDepsOf(refuse, fallback));

      await runner.run('h1', grouped);

      expect(fallback.mock.calls[0]?.[0]).toStrictEqual(flat);
    });

    it('WHEN there is no ELK and the fallback throws THEN the grid covers the packages only', async () => {
      const refuse = (): ElkLike => {
        throw new Error('Trusted Types policy tc-elk is unavailable');
      };
      const runner = createLayoutRunner(runnerDepsOf(refuse, failingFallbackMock()));

      const result = await runner.run('h1', grouped);

      expect(Object.keys(result?.positions ?? {})).toStrictEqual(['docs', 'web', '@acme/config', '@acme/ui', '@acme/utils']);
    });
  });
});
