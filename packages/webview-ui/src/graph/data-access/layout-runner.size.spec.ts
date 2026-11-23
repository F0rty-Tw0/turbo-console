import type { ElkNode } from 'elkjs/lib/elk-api.js';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLayoutRunner } from './layout-runner.ts';
import { ELK_NODES_MAX } from '../common/graph.const.ts';
import type { ElkLike, LayoutRunner } from '../common/layout.type.ts';
import type { ElkMock } from '../test/common/elk-mock.type.ts';
import { elkMock } from '../test/mocks/elk.mock.ts';
import { ELK_GRAPH_STUB, LAID_OUT_STUB } from '../test/stubs/layout.stub.ts';
import { runnerDepsOf } from '../test/utils/layout-runner.spec.util.ts';

const leafAt = (index: number): ElkNode => {
  const leaf: ElkNode = { id: `p${index}`, width: 10, height: 10 };

  return leaf;
};

const LEAVES_AT_MAX: ElkNode[] = Array.from({ length: ELK_NODES_MAX }, (_unused, index) => leafAt(index));

/** Exactly `ELK_NODES_MAX` nodes, all leaves at the root. */
const AT_MAX: ElkNode = { id: 'root', children: LEAVES_AT_MAX };

/** The same leaves inside one folder compound: the compound is node `ELK_NODES_MAX + 1`. */
const FOLDER_AT_MAX: ElkNode = { id: 'folder', children: LEAVES_AT_MAX };

const PAST_MAX_NESTED: ElkNode = { id: 'root', children: [FOLDER_AT_MAX] };

describe('FEATURE: createLayoutRunner, a graph past ELK_NODES_MAX', () => {
  let mock: ElkMock;
  let createElk: Mock<() => ElkLike>;
  let runner: LayoutRunner;

  beforeEach((): void => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    mock = elkMock();
    createElk = vi.fn<() => ElkLike>(() => mock.elk);
    runner = createLayoutRunner(runnerDepsOf(createElk));
  });

  afterEach((): void => {
    vi.useRealTimers();
  });

  describe('GIVEN a graph of exactly ELK_NODES_MAX nodes', () => {
    it('WHEN it runs THEN ELK lays it out', async () => {
      const pending = runner.run('h1', AT_MAX);

      mock.resolveLayout(LAID_OUT_STUB);

      await expect(pending).resolves.toMatchObject({ engine: 'elk' });
    });
  });

  describe('GIVEN a graph one nested compound past ELK_NODES_MAX', () => {
    it('WHEN it runs THEN it lands as the fallback at once and no ELK is created', async () => {
      await expect(runner.run('h1', PAST_MAX_NESTED)).resolves.toMatchObject({ hash: 'h1', engine: 'fallback', ms: 0 });
      expect(createElk).not.toHaveBeenCalled();
    });

    it('WHEN it runs forced THEN ELK lays it out', async () => {
      const pending = runner.run('h1', PAST_MAX_NESTED, true);

      mock.resolveLayout(LAID_OUT_STUB);

      await expect(pending).resolves.toMatchObject({ engine: 'elk' });
    });
  });

  describe('GIVEN a small layout in flight', () => {
    it('WHEN a graph past ELK_NODES_MAX runs THEN the busy ELK is terminated and the small run resolves null', async () => {
      const first = runner.run('h1', ELK_GRAPH_STUB);
      const second = runner.run('h2', PAST_MAX_NESTED);

      mock.resolveLayout(LAID_OUT_STUB);

      await expect(second).resolves.toMatchObject({ hash: 'h2', engine: 'fallback' });
      await expect(first).resolves.toBeNull();
      expect(mock.terminate).toHaveBeenCalledOnce();
    });
  });
});
