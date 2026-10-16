import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ElapsedTicker } from './elapsed-ticker.ts';
import type { RunEntry, RunState } from '../../run/common/run.type.ts';
import { RUN_ENTRY_STUB } from '../../run/test/stubs/run.stub.ts';
import type { RunningTasks } from '../common/tree-node.type.ts';
import { tickerPortsOf } from '../data-access/ticker-ports.ts';
import type { RunChangesFake, VisibleViewFake } from '../test/common/ticker-fakes.type.ts';
import { runChangesFake, taskKeysOf, visibleViewFake } from '../test/utils/ticker-fakes.spec.util.ts';

const SECOND = 1000;

const entryOf = (taskId: string, state: RunState, root = '/ws'): RunEntry => {
  const entry: RunEntry = { ...RUN_ENTRY_STUB, root, taskId, state };

  return entry;
};

describe('FEATURE: elapsed ticker', () => {
  let changes: RunChangesFake;
  let fired: string[][];
  let ticker: ElapsedTicker;

  beforeEach(() => {
    vi.useFakeTimers();
    changes = runChangesFake();
    fired = [];

    const refreshTasks = (running: RunningTasks): void => {
      fired.push(taskKeysOf(running));
    };

    ticker = new ElapsedTicker(changes.runs, tickerPortsOf({ refreshTasks }));
  });

  afterEach(() => {
    ticker.dispose();
    vi.useRealTimers();
  });

  describe('GIVEN no bound view (an untrusted window)', () => {
    it('WHEN a run starts THEN no interval is armed', () => {
      changes.emit(entryOf('a#dev', 'running'));

      expect(vi.getTimerCount()).toBe(0);
    });

    it('WHEN a run goes for seconds THEN ticks() reads 0 and nothing fires', () => {
      changes.emit(entryOf('a#dev', 'running'));

      vi.advanceTimersByTime(3 * SECOND);

      expect([ticker.api().ticks(), fired.length]).toStrictEqual([0, 0]);
    });
  });

  describe('GIVEN a bound visible view', () => {
    beforeEach(() => {
      ticker.bind(visibleViewFake(true).view);
    });

    it('WHEN no run is going THEN no interval is armed', () => {
      expect(vi.getTimerCount()).toBe(0);
    });

    it('WHEN a run ends that was never seen running THEN no interval is armed', () => {
      changes.emit(entryOf('a#dev', 'failed'));

      expect(vi.getTimerCount()).toBe(0);
    });

    it('WHEN the first run starts THEN one interval is armed', () => {
      changes.emit(entryOf('a#dev', 'running'));

      expect(vi.getTimerCount()).toBe(1);
    });

    it('WHEN a run starts THEN nothing fires before the first second', () => {
      changes.emit(entryOf('a#dev', 'running'));

      vi.advanceTimersByTime(SECOND - 1);

      expect(fired).toStrictEqual([]);
    });

    it('WHEN a run goes for two seconds THEN each tick fires exactly its task', () => {
      changes.emit(entryOf('a#dev', 'running'));

      vi.advanceTimersByTime(2 * SECOND);

      expect(fired).toStrictEqual([
        ['/ws a#dev'],
        ['/ws a#dev']
      ]);
    });

    it('WHEN a run goes for two seconds THEN the api taken before reads 2 ticks, live', () => {
      const api = ticker.api();

      changes.emit(entryOf('a#dev', 'running'));
      vi.advanceTimersByTime(2 * SECOND);

      expect(api.ticks()).toBe(2);
    });

    it('WHEN a running entry changes again while running (a match lands) THEN its task fires once per tick', () => {
      changes.emit(entryOf('a#dev', 'running'));
      changes.emit(entryOf('a#dev', 'running'));

      vi.advanceTimersByTime(SECOND);

      expect(fired).toStrictEqual([['/ws a#dev']]);
    });

    it('WHEN an idle task changes state THEN only the running one fires', () => {
      changes.emit(entryOf('a#dev', 'running'));
      changes.emit(entryOf('b#build', 'passed'));

      vi.advanceTimersByTime(SECOND);

      expect(fired).toStrictEqual([['/ws a#dev']]);
    });

    describe('WHEN two runs of one root go and one ends', () => {
      beforeEach(() => {
        changes.emit(entryOf('a#dev', 'running'));
        changes.emit(entryOf('b#dev', 'running'));
        changes.emit(entryOf('a#dev', 'passed'));
      });

      it('THEN each later tick fires only the other', () => {
        vi.advanceTimersByTime(2 * SECOND);

        expect(fired).toStrictEqual([
          ['/ws b#dev'],
          ['/ws b#dev']
        ]);
      });

      it('THEN the interval stays armed', () => {
        expect(vi.getTimerCount()).toBe(1);
      });
    });

    describe('WHEN two runs of one root go and both end', () => {
      beforeEach(() => {
        changes.emit(entryOf('a#dev', 'running'));
        changes.emit(entryOf('b#dev', 'running'));
        changes.emit(entryOf('a#dev', 'passed'));
        changes.emit(entryOf('b#dev', 'stopped'));
      });

      it('THEN the interval is cleared', () => {
        expect(vi.getTimerCount()).toBe(0);
      });

      it('THEN nothing fires afterwards', () => {
        vi.advanceTimersByTime(3 * SECOND);

        expect(fired).toStrictEqual([]);
      });
    });

    it('WHEN runs of two roots go for one second THEN the tick fires once, carrying both tasks', () => {
      changes.emit(entryOf('a#dev', 'running', '/one'));
      changes.emit(entryOf('b#dev', 'running', '/one'));
      changes.emit(entryOf('a#dev', 'running', '/two'));

      vi.advanceTimersByTime(SECOND);

      expect(fired).toStrictEqual([['/one a#dev', '/one b#dev', '/two a#dev']]);
    });

    describe('WHEN runs of two roots go and the first root’s run ends', () => {
      beforeEach(() => {
        changes.emit(entryOf('a#dev', 'running', '/one'));
        changes.emit(entryOf('a#dev', 'running', '/two'));
        changes.emit(entryOf('a#dev', 'failed', '/one'));
      });

      it('THEN each tick fires only the second root’s task', () => {
        vi.advanceTimersByTime(SECOND);

        expect(fired).toStrictEqual([['/two a#dev']]);
      });

      it('WHEN the second root’s run ends too THEN the interval is cleared', () => {
        changes.emit(entryOf('a#dev', 'passed', '/two'));

        expect(vi.getTimerCount()).toBe(0);
      });
    });

    it('WHEN the ticker is disposed during a run THEN the interval is cleared', () => {
      changes.emit(entryOf('a#dev', 'running'));

      ticker.dispose();

      expect(vi.getTimerCount()).toBe(0);
    });

    it('WHEN the ticker is disposed THEN a later run arms nothing', () => {
      ticker.dispose();

      changes.emit(entryOf('a#dev', 'running'));

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('GIVEN a bound view that is visible with a run going', () => {
    let fake: VisibleViewFake;

    beforeEach(() => {
      fake = visibleViewFake(true);
      ticker.bind(fake.view);
      changes.emit(entryOf('a#dev', 'running'));
    });

    it('WHEN the view hides THEN the interval is cleared', () => {
      fake.setVisible(false);

      expect(vi.getTimerCount()).toBe(0);
    });

    it('WHEN the view hides THEN nothing fires afterwards', () => {
      fake.setVisible(false);

      vi.advanceTimersByTime(3 * SECOND);

      expect(fired).toStrictEqual([]);
    });
  });

  describe('GIVEN a bound hidden view', () => {
    let fake: VisibleViewFake;

    beforeEach(() => {
      fake = visibleViewFake(false);
      ticker.bind(fake.view);
    });

    it('WHEN a run starts THEN no interval is armed', () => {
      changes.emit(entryOf('a#dev', 'running'));

      expect(vi.getTimerCount()).toBe(0);
    });

    it('WHEN the view shows with a run going THEN its task fires at once', () => {
      changes.emit(entryOf('a#dev', 'running'));

      fake.setVisible(true);

      expect(fired).toStrictEqual([['/ws a#dev']]);
    });

    it('WHEN the view shows with a run going THEN an interval is armed', () => {
      changes.emit(entryOf('a#dev', 'running'));

      fake.setVisible(true);

      expect(vi.getTimerCount()).toBe(1);
    });

    it('WHEN the view shows with a run going THEN the fire on show is not counted as a tick', () => {
      changes.emit(entryOf('a#dev', 'running'));

      fake.setVisible(true);

      expect(ticker.api().ticks()).toBe(0);
    });

    it('WHEN a run starts and ends while hidden and the view then shows THEN nothing fires and no interval is armed', () => {
      changes.emit(entryOf('a#dev', 'running'));
      changes.emit(entryOf('a#dev', 'passed'));

      fake.setVisible(true);

      expect([fired.length, vi.getTimerCount()]).toStrictEqual([0, 0]);
    });

    it('WHEN the view shows with no run going THEN nothing fires and no interval is armed', () => {
      fake.setVisible(true);

      expect([fired.length, vi.getTimerCount()]).toStrictEqual([0, 0]);
    });
  });

  describe('GIVEN a run going before any view is bound', () => {
    it('WHEN a visible view is bound THEN an interval is armed', () => {
      changes.emit(entryOf('a#dev', 'running'));

      ticker.bind(visibleViewFake(true).view);

      expect(vi.getTimerCount()).toBe(1);
    });
  });

  describe('GIVEN the view binding is disposed', () => {
    it('WHEN the view then shows with a run going THEN nothing fires and no interval is armed', () => {
      const fake = visibleViewFake(false);
      const binding = ticker.bind(fake.view);

      binding.dispose();
      changes.emit(entryOf('a#dev', 'running'));
      fake.setVisible(true);

      expect([fired.length, vi.getTimerCount()]).toStrictEqual([0, 0]);
    });

    it('WHEN it was visible with a run going THEN the interval is cleared, as unbound counts as hidden', () => {
      const binding = ticker.bind(visibleViewFake(true).view);

      changes.emit(entryOf('a#dev', 'running'));
      binding.dispose();

      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
