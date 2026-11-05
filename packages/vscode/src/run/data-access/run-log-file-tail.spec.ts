import type { RunLogEvent } from '@turbo-console/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunLogFileTail } from './run-log-file-tail.ts';
import { flush } from '../../tree/test/utils/atom-load.spec.util.ts';
import {
  CACHE_HIT_A,
  ENTRY_CACHE_HIT,
  ENTRY_COUNT_MULTI_WINDOW,
  ENTRY_TEXT_SIZE,
  ENTRY_TURBO,
  LOG_PATH,
  OVERSIZE_OBJECT_SIZE,
  OVERSIZE_READS_MAX,
  SEEN_A,
  SEEN_B
} from '../test/common/run-log-fs.const.ts';
import type { FakeLogFs } from '../test/common/run-log-fs.type.ts';
import { ENTRY_A, ENTRY_B, INVALID_OBJECT } from '../test/common/run-log-step.const.ts';
import { byteLengthOf, bytesOf, entryLinesOf, openObjectOf, turboLogTextOf } from '../test/utils/run-log-bytes.spec.util.ts';
import { endChangeWindow, fakeChangeWindows } from '../test/utils/run-log-change-window.spec.util.ts';
import { bytesReadOf, fakeLogFs } from '../test/utils/run-log-fs.spec.util.ts';

describe('FEATURE: tail one turbo log file (spec D5)', () => {
  let fs: FakeLogFs;
  let events: RunLogEvent[];
  let tail: RunLogFileTail;

  beforeEach(() => {
    const onEvent = (event: RunLogEvent): void => {
      events.push(event);
    };

    fakeChangeWindows();
    fs = fakeLogFs();
    events = [];
    tail = new RunLogFileTail(LOG_PATH, fs.read, onEvent);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN a file with lines of a#build and b#build and a turbo line', () => {
    beforeEach(() => {
      fs.write(LOG_PATH, [ENTRY_A, ENTRY_TURBO, ENTRY_B]);
    });

    it('WHEN changed THEN seen a#build, seen b#build in file order and nothing for turbo', async () => {
      tail.changed();
      await endChangeWindow();

      expect(events).toStrictEqual([SEEN_A, SEEN_B]);
    });

    it('WHEN a cache-hit line of a#build is appended and changed again THEN one cacheHit a#build more', async () => {
      tail.changed();
      await endChangeWindow();

      fs.append(LOG_PATH, ENTRY_CACHE_HIT);
      tail.changed();
      await endChangeWindow();

      expect(events).toStrictEqual([SEEN_A, SEEN_B, CACHE_HIT_A]);
    });
  });

  describe('GIVEN a read held in flight', () => {
    it('WHEN changed three more times THEN one read before release and exactly one more after it', async () => {
      fs.write(LOG_PATH, [ENTRY_A]);
      const release = fs.hold();

      tail.changed();
      await endChangeWindow();
      tail.changed();
      tail.changed();
      tail.changed();
      await endChangeWindow();
      const readsHeld = fs.reads.length;

      release();
      await flush();
      const readsReleased = fs.reads.length;

      expect([readsHeld, readsReleased]).toStrictEqual([1, 2]);
    });

    it('WHEN changed, the read fails on its listener and the window opened meanwhile ends THEN no read follows', async () => {
      const throwOnEvent = (): void => {
        throw new Error('listener broke');
      };
      const throwingTail = new RunLogFileTail(LOG_PATH, fs.read, throwOnEvent);

      fs.write(LOG_PATH, [ENTRY_A]);
      const release = fs.hold();

      throwingTail.changed();
      await endChangeWindow();
      throwingTail.changed();
      release();
      await flush();
      await endChangeWindow();

      expect(fs.reads).toHaveLength(1);
    });
  });

  describe('GIVEN a file of a#build and b#build and changes inside one window', () => {
    beforeEach(() => {
      fs.write(LOG_PATH, [ENTRY_A, ENTRY_B]);
      tail.changed();
      tail.changed();
      tail.changed();
    });

    it('WHEN the window ends THEN one read, none before it', async () => {
      await flush();
      const readsInWindow = fs.reads.length;

      await endChangeWindow();

      expect([readsInWindow, fs.reads.length]).toStrictEqual([0, 1]);
    });

    it('WHEN drained in the window THEN its lines arrive at once and no window is left', async () => {
      await tail.drain();

      expect([events, vi.getTimerCount()]).toStrictEqual([[SEEN_A, SEEN_B], 0]);
    });

    it('WHEN closed in the window THEN no read and no window is left', async () => {
      await tail.close();
      await flush();

      expect([fs.reads.length, vi.getTimerCount()]).toStrictEqual([0, 0]);
    });
  });

  describe('GIVEN a file of 2.5 MiB of entries (three windows)', () => {
    it('WHEN changed once THEN every entry arrives (the loop reads while a read is full)', async () => {
      fs.write(LOG_PATH, entryLinesOf(ENTRY_COUNT_MULTI_WINDOW, ENTRY_TEXT_SIZE));

      tail.changed();
      await endChangeWindow();

      expect(events).toHaveLength(ENTRY_COUNT_MULTI_WINDOW);
    });
  });

  describe('GIVEN 200 entries appended one by one with a change after each', () => {
    it('WHEN all are read THEN bytes read ≤ file size + 3 × reads (re-read stays at the tail)', async () => {
      const lines = entryLinesOf(200, 20);
      const fileSize = byteLengthOf(turboLogTextOf(lines));

      fs.write(LOG_PATH, []);

      for (const line of lines) {
        fs.append(LOG_PATH, line);
        tail.changed();
        await endChangeWindow();
      }
      const bytesRead = bytesReadOf(fs.reads);

      expect(bytesRead).toBeLessThanOrEqual(fileSize + 3 * fs.reads.length);
    });
  });

  describe("GIVEN a 2 MiB open object then a newline and a#build's line (livelock)", () => {
    it('WHEN drained THEN seen a#build arrives and at most 4 reads ran', async () => {
      const text = `[\n${openObjectOf(OVERSIZE_OBJECT_SIZE)}\n${ENTRY_A}\n]\n`;

      fs.files.set(LOG_PATH, bytesOf(text));

      await tail.drain();

      expect(events).toStrictEqual([SEEN_A]);
      expect(fs.reads.length).toBeLessThanOrEqual(OVERSIZE_READS_MAX);
    });
  });

  describe('GIVEN lines written with no change call (a missed watch event)', () => {
    it('WHEN drained THEN every line arrives and the outcome is read', async () => {
      fs.write(LOG_PATH, [ENTRY_A, ENTRY_B]);

      const outcome = await tail.drain();

      expect(events).toStrictEqual([SEEN_A, SEEN_B]);
      expect(outcome).toBe('read');
    });
  });

  describe('GIVEN a drain while a read is held', () => {
    it('WHEN released THEN the drain reads once more to the end and lines written meanwhile arrive', async () => {
      fs.write(LOG_PATH, [ENTRY_A]);
      const release = fs.hold();

      tail.changed();
      await endChangeWindow();
      const drained = tail.drain();

      fs.append(LOG_PATH, ENTRY_B);
      release();
      await drained;

      expect(events).toStrictEqual([SEEN_A, SEEN_B]);
    });
  });

  describe('GIVEN no file ever written', () => {
    it('WHEN drained THEN the outcome is missing', async () => {
      const outcome = await tail.drain();

      expect(outcome).toBe('missing');
    });
  });

  describe('GIVEN the empty array turbo creates ([\\n]\\n)', () => {
    it('WHEN drained THEN the outcome is read: the file appeared', async () => {
      fs.write(LOG_PATH, []);

      const outcome = await tail.drain();

      expect(outcome).toBe('read');
    });
  });

  describe('GIVEN a file of 0 bytes', () => {
    it('WHEN drained THEN the outcome is read, not missing: the file exists', async () => {
      fs.files.set(LOG_PATH, bytesOf(''));

      const outcome = await tail.drain();

      expect(outcome).toBe('read');
    });
  });

  describe('GIVEN three invalid objects first', () => {
    it('WHEN drained THEN the outcome is unknown, no event, and no read follows the one that proved it', async () => {
      fs.write(LOG_PATH, [INVALID_OBJECT, INVALID_OBJECT, INVALID_OBJECT]);
      const release = fs.hold();

      tail.changed();
      await endChangeWindow();
      const drained = tail.drain();

      release();
      const outcome = await drained;

      expect([outcome, events, fs.reads.length]).toStrictEqual(['unknown', [], 1]);
    });
  });
});
