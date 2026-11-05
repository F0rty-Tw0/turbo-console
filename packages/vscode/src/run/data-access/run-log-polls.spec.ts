import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunLogPolls } from './run-log-polls.ts';
import { RUN_LOG_POLL_MS } from '../common/run-log-tail.const.ts';

describe('FEATURE: the per-root run log polls', () => {
  let polls: RunLogPolls;
  let calls: string[];

  const pollOf = (root: string): (() => void) => {
    const onPoll = (): void => {
      calls.push(root);
    };

    return onPoll;
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    polls = new RunLogPolls();
    calls = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a started root', () => {
    beforeEach(() => {
      polls.start('/ws', pollOf('/ws'));
    });

    it('WHEN two intervals pass THEN it polled twice', () => {
      vi.advanceTimersByTime(RUN_LOG_POLL_MS * 2);

      expect(calls).toStrictEqual(['/ws', '/ws']);
    });

    it('WHEN started again THEN it keeps one timer', () => {
      polls.start('/ws', pollOf('/ws'));

      expect(vi.getTimerCount()).toBe(1);
    });

    it('WHEN another root starts and the first stops THEN only the other keeps polling', () => {
      polls.start('/other', pollOf('/other'));
      polls.stop('/ws');
      vi.advanceTimersByTime(RUN_LOG_POLL_MS);

      expect(calls).toStrictEqual(['/other']);
    });

    it('WHEN stopped twice THEN no timer is left and nothing throws', () => {
      polls.stop('/ws');
      polls.stop('/ws');

      expect(vi.getTimerCount()).toBe(0);
    });
  });
});
