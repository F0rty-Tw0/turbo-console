import type { RunLogEvent } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RunLogFileTail } from './run-log-file-tail.ts';
import { flush } from '../../tree/test/utils/atom-load.spec.util.ts';
import type { RunLogListener, RunLogRead } from '../common/run-log-tail.type.ts';
import { LOG_PATH, SEEN_A } from '../test/common/run-log-fs.const.ts';
import type { FakeLogFs } from '../test/common/run-log-fs.type.ts';
import { ENTRY_A, ENTRY_B } from '../test/common/run-log-step.const.ts';
import { afterHops } from '../test/utils/microtask-hops.spec.util.ts';
import { fakeLogFs } from '../test/utils/run-log-fs.spec.util.ts';

const HOPS_AFTER_READ = [0, 1, 2, 3, 4, 5, 6];

describe('FEATURE: end a turbo log tail (spec D5)', () => {
  let fs: FakeLogFs;
  let events: RunLogEvent[];
  let tail: RunLogFileTail;

  const tailOf = (read: RunLogRead, onEvent: RunLogListener): RunLogFileTail => new RunLogFileTail(LOG_PATH, read, onEvent);

  beforeEach(() => {
    const onEvent = (event: RunLogEvent): void => {
      events.push(event);
    };

    fs = fakeLogFs();
    events = [];
    tail = tailOf(fs.read, onEvent);
  });

  describe('GIVEN a drained tail', () => {
    it('WHEN drained again THEN the same outcome and no read', async () => {
      fs.write(LOG_PATH, [ENTRY_A]);
      const first = await tail.drain();
      const readsAfterFirst = fs.reads.length;

      const second = await tail.drain();

      expect([second, fs.reads.length]).toStrictEqual([first, readsAfterFirst]);
    });
  });

  describe('GIVEN a read held and drain called twice before it is released', () => {
    it('WHEN released THEN both resolve read and one read ran in all (the second call shares the drain)', async () => {
      fs.write(LOG_PATH, [ENTRY_A]);
      const release = fs.hold();

      const first = tail.drain();
      const second = tail.drain();

      release();
      const outcomes = await Promise.all([first, second]);

      expect([outcomes, fs.reads.length]).toStrictEqual([['read', 'read'], 1]);
    });
  });

  describe('GIVEN a read in flight when the tail is closed', () => {
    it('WHEN the read resolves THEN no event is emitted', async () => {
      fs.write(LOG_PATH, [ENTRY_A]);
      const release = fs.hold();

      tail.changed();
      const closing = tail.close();

      release();
      await closing;

      expect(events).toStrictEqual([]);
    });

    it('WHEN the read is still held THEN close is still pending', async () => {
      fs.write(LOG_PATH, [ENTRY_A]);
      const release = fs.hold();
      let isClosed = false;
      const markClosed = (): void => {
        isClosed = true;
      };

      tail.changed();
      const closing = tail.close().then(markClosed);

      await flush();
      const isPending = !isClosed;

      release();
      await closing;

      expect(isPending).toBe(true);
    });
  });

  describe('GIVEN a pending drain when the tail is closed (critic E2)', () => {
    it('WHEN the held read resolves THEN the drain resolves read and no further read runs', async () => {
      fs.write(LOG_PATH, [ENTRY_A]);
      const release = fs.hold();

      tail.changed();
      const drained = tail.drain();
      const closing = tail.close();

      release();
      const outcome = await drained;

      await closing;

      expect([outcome, fs.reads.length]).toStrictEqual(['read', 1]);
    });
  });

  describe('GIVEN a closed tail that read nothing', () => {
    it('WHEN drained THEN the outcome is missing and no read ran', async () => {
      fs.write(LOG_PATH, [ENTRY_A]);
      await tail.close();

      const outcome = await tail.drain();

      expect([outcome, fs.reads.length]).toStrictEqual(['missing', 0]);
    });
  });

  describe('GIVEN a listener that closes the tail on its first event and a file of a#build and b#build', () => {
    it('WHEN changed THEN only seen a#build arrives', async () => {
      const seen: RunLogEvent[] = [];
      let closing: Promise<void> = Promise.resolve();
      const closeOnFirst: RunLogListener = (event) => {
        seen.push(event);
        closing = tail.close();
      };

      tail = tailOf(fs.read, closeOnFirst);

      fs.write(LOG_PATH, [ENTRY_A, ENTRY_B]);
      tail.changed();
      await flush();
      await closing;

      expect(seen).toStrictEqual([SEEN_A]);
    });
  });

  describe('GIVEN a read that rejects', () => {
    it('WHEN changed twice then drained THEN the outcome is failed, one read ran and no rejection goes unhandled', async () => {
      const failingRead = vi.fn<RunLogRead>(async () => Promise.reject(new Error('disk gone')));
      const failingTail = tailOf(failingRead, vi.fn());
      const unhandled: unknown[] = [];
      const collect = (reason: unknown): void => {
        unhandled.push(reason);
      };

      process.on('unhandledRejection', collect);
      failingTail.changed();
      failingTail.changed();
      const outcome = await failingTail.drain();

      await flush();
      process.off('unhandledRejection', collect);

      expect([outcome, failingRead.mock.calls.length, unhandled]).toStrictEqual(['failed', 1, []]);
    });
  });

  describe('GIVEN a listener that throws on the first event and a file of a#build and b#build', () => {
    it('WHEN drained THEN the outcome is failed and no further event or read follows', async () => {
      const throwOnEvent: RunLogListener = (event) => {
        events.push(event);

        throw new Error('listener broke');
      };
      const throwingTail = tailOf(fs.read, throwOnEvent);

      fs.write(LOG_PATH, [ENTRY_A, ENTRY_B]);
      const outcome = await throwingTail.drain();

      expect([outcome, events, fs.reads.length]).toStrictEqual(['failed', [SEEN_A], 1]);
    });
  });

  describe.each(HOPS_AFTER_READ)('GIVEN a change landing %i promise hops after the first read returned', (hops) => {
    it('WHEN drained THEN no read is in flight and no read or event follows the drain', async () => {
      const land = (): void => {
        fs.append(LOG_PATH, ENTRY_B);
        tail.changed();
      };
      let inFlight = 0;
      const readThenLand: RunLogRead = async (path, from, max) => {
        inFlight += 1;
        const bytes = await fs.read(path, from, max);

        if (fs.reads.length === 1) afterHops(hops, land);
        else await flush();

        inFlight -= 1;

        return bytes;
      };
      const collect: RunLogListener = (event) => {
        events.push(event);
      };

      tail = tailOf(readThenLand, collect);

      fs.write(LOG_PATH, [ENTRY_A]);
      await tail.drain();
      const afterDrain = [inFlight, fs.reads.length, events.length];

      await flush();

      expect(afterDrain[0]).toBe(0);
      expect([inFlight, fs.reads.length, events.length]).toStrictEqual(afterDrain);
    });
  });

  describe('GIVEN an ended tail', () => {
    it.each([
      ['drained', 'drain'],
      ['closed', 'close']
    ] as const)('WHEN %s then changed THEN no read', async (_, ending) => {
      fs.write(LOG_PATH, [ENTRY_A]);
      await tail[ending]();
      const readsAfterEnd = fs.reads.length;

      tail.changed();
      await flush();

      expect(fs.reads).toHaveLength(readsAfterEnd);
    });
  });
});
