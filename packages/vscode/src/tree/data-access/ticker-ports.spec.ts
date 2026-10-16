import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tickerPortsOf } from './ticker-ports.ts';
import type { PackagesTreeApi } from '../common/tree-node.type.ts';
import { packagesTreeApiMock } from '../test/mocks/packages-tree-api.mock.ts';

describe('FEATURE: ticker ports', () => {
  let tree: PackagesTreeApi;

  beforeEach(() => {
    vi.useFakeTimers();
    tree = packagesTreeApiMock();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('GIVEN a tree WHEN a task fires THEN that task of that root is refreshed', () => {
    const { fire } = tickerPortsOf(tree);

    fire('/ws', 'a#dev');

    expect(vi.mocked(tree.refreshTask).mock.calls).toStrictEqual([['/ws', 'a#dev']]);
  });

  describe('GIVEN an interval armed with every', () => {
    it('WHEN nothing else happens THEN one timer is pending', () => {
      const { every } = tickerPortsOf(tree);

      every(1000, vi.fn());

      expect(vi.getTimerCount()).toBe(1);
    });

    it('WHEN its period passes twice THEN the tick runs twice', () => {
      const { every } = tickerPortsOf(tree);
      const tick = vi.fn();

      every(1000, tick);
      vi.advanceTimersByTime(2000);

      expect(tick).toHaveBeenCalledTimes(2);
    });

    it('WHEN its clear runs THEN no timer is pending', () => {
      const { every } = tickerPortsOf(tree);
      const clear = every(1000, vi.fn());

      clear();

      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
