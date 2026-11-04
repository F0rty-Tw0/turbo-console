import type { RunLogEvent } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

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
import { bytesReadOf, fakeLogFs } from '../test/utils/run-log-fs.spec.util.ts';

describe('FEATURE: tail one turbo log file (spec D5)', () => {
  let fs: FakeLogFs;
  let events: RunLogEvent[];
  let tail: RunLogFileTail;

  beforeEach(() => {
    const onEvent = (event: RunLogEvent): void => {
      events.push(event);
    };

    fs = fakeLogFs();
    events = [];
    tail = new RunLogFileTail(LOG_PATH, fs.read, onEvent);
  });

  describe('GIVEN a file with lines of a#build and b#build and a turbo line', () => {
    beforeEach(() => {
      fs.write(LOG_PATH, [ENTRY_A, ENTRY_TURBO, ENTRY_B]);
    });

    it('WHEN changed THEN seen a#build, seen b#build in file order and nothing for turbo', async () => {
      tail.changed();
      await flush();

      expect(events).toStrictEqual([SEEN_A, SEEN_B]);
    });

    it('WHEN a cache-hit line of a#build is appended and changed again THEN one cacheHit a#build more', async () => {
      tail.changed();
      await flush();

      fs.append(LOG_PATH, ENTRY_CACHE_HIT);
      tail.changed();
      await flush();

      expect(events).toStrictEqual([SEEN_A, SEEN_B, CACHE_HIT_A]);
    });
  });

  describe('GIVEN a read held in flight', () => {
    it('WHEN changed three more times THEN one read before release and exactly one more after it', async () => {
      fs.write(LOG_PATH, [ENTRY_A]);
      const release = fs.hold();

      tail.changed();
      tail.changed();
      tail.changed();
      tail.changed();
      await flush();
      const readsHeld = fs.reads.length;

      release();
      await flush();
      const readsReleased = fs.reads.length;

      expect([readsHeld, readsReleased]).toStrictEqual([1, 2]);
    });
  });

  describe('GIVEN a file of 2.5 MiB of entries (three windows)', () => {
    it('WHEN changed once THEN every entry arrives (the loop reads while a read is full)', async () => {
      fs.write(LOG_PATH, entryLinesOf(ENTRY_COUNT_MULTI_WINDOW, ENTRY_TEXT_SIZE));

      tail.changed();
      await flush();

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
        await flush();
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
      const drained = tail.drain();

      release();
      const outcome = await drained;

      expect([outcome, events, fs.reads.length]).toStrictEqual(['unknown', [], 1]);
    });
  });
});
