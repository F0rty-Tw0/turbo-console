import { beforeEach, describe, expect, it } from 'vitest';

import { RunLogTails } from './run-log-tails.ts';
import { flush } from '../../tree/test/utils/atom-load.spec.util.ts';
import type { RunLogPorts } from '../common/run-log-tail.type.ts';
import { SEEN_A, SEEN_B } from '../test/common/run-log-fs.const.ts';
import { ENTRY_A, ENTRY_B } from '../test/common/run-log-step.const.ts';
import { ROOT_OTHER, ROOT_WS } from '../test/common/run-log-tails.const.ts';
import type { StartedTail, TailsHarness } from '../test/common/run-log-tails.type.ts';
import { logPathOf, tailsHarnessOf } from '../test/utils/run-log-tails.spec.util.ts';
import { runLogDirOf } from '../utils/run-log-dir.util.ts';
import { runLogWatchErrorText } from '../utils/run-text.util.ts';

const tailsOf = (ports: RunLogPorts): RunLogTails => new RunLogTails(ports);

const DIR_WS = runLogDirOf(ROOT_WS);
const DIR_OTHER = runLogDirOf(ROOT_OTHER);
const P1 = logPathOf(ROOT_WS, 'run-1.json');
const P2 = logPathOf(ROOT_WS, 'run-2.json');
const P3 = logPathOf(ROOT_OTHER, 'run-3.json');

describe("FEATURE: the window's turbo log tails (spec D5, D6)", () => {
  let h: TailsHarness;

  beforeEach(() => {
    h = tailsHarnessOf(tailsOf);
  });

  describe('GIVEN two tails of /ws and one of /other', () => {
    let tail1: StartedTail;
    let tail2: StartedTail;

    beforeEach(async () => {
      tail1 = h.start(ROOT_WS, P1);
      tail2 = h.start(ROOT_WS, P2);
      h.start(ROOT_OTHER, P3);
      await flush();
    });

    it('WHEN started THEN one watcher per root folder', () => {
      expect(h.fs.watchers.map((watcher) => watcher.dir)).toStrictEqual([DIR_WS, DIR_OTHER]);
    });

    it("WHEN a watch event names P2 THEN only P2's new line arrives", async () => {
      h.fs.append(P1, ENTRY_A);
      h.fs.append(P2, ENTRY_B);

      h.fs.emit(DIR_WS, 'run-2.json');
      await flush();

      expect([tail1.events, tail2.events]).toStrictEqual([[], [SEEN_B]]);
    });

    it('WHEN a watch event has no file name THEN both /ws tails read', async () => {
      h.fs.append(P1, ENTRY_A);
      h.fs.append(P2, ENTRY_B);

      h.fs.emit(DIR_WS, null);
      await flush();

      expect([tail1.events, tail2.events]).toStrictEqual([[SEEN_A], [SEEN_B]]);
    });

    it('WHEN a watch event names an unknown file THEN no read', async () => {
      const readsBefore = h.fs.reads.length;

      h.fs.emit(DIR_WS, 'notes.txt');
      await flush();

      expect(h.fs.reads).toHaveLength(readsBefore);
    });

    it('WHEN a /ws tail is closed and its file changes THEN its listener gets no event', async () => {
      tail1.tail.close();
      h.fs.append(P1, ENTRY_A);
      h.fs.emit(DIR_WS, 'run-1.json');
      await flush();

      expect(tail1.events).toStrictEqual([]);
    });

    it('WHEN one /ws tail drains THEN the /ws watcher stays open', async () => {
      await tail1.tail.drain();

      expect(h.fs.watchers.map((watcher) => watcher.closed)).toStrictEqual([false, false]);
    });

    it("WHEN both /ws tails drain THEN the /ws watcher is closed and /other's is not", async () => {
      await tail1.tail.drain();
      await tail2.tail.drain();

      expect(h.fs.watchers.map((watcher) => watcher.closed)).toStrictEqual([true, false]);
    });
  });

  describe('GIVEN a file that already holds lines when its tail starts', () => {
    it('WHEN started THEN its lines arrive without a watch event', async () => {
      h.fs.write(P1, [ENTRY_A, ENTRY_B]);

      const started = h.start(ROOT_WS, P1);

      await flush();

      expect(started.events).toStrictEqual([SEEN_A, SEEN_B]);
    });
  });

  describe('GIVEN the same path started twice', () => {
    it('WHEN started again THEN no second tail reads it', async () => {
      h.start(ROOT_WS, P1);
      h.start(ROOT_WS, P1);
      await flush();

      expect(h.fs.reads).toHaveLength(1);
    });
  });

  describe('GIVEN the /ws watcher fails', () => {
    const error = new Error('EMFILE');
    let started: StartedTail;

    beforeEach(() => {
      started = h.start(ROOT_WS, P1);
    });

    it('WHEN it fails THEN it is closed and one line is logged', () => {
      h.fs.fail(DIR_WS, error);

      expect([h.fs.watchers[0]?.closed, h.fs.logs]).toStrictEqual([true, [runLogWatchErrorText(DIR_WS, error)]]);
    });

    it('WHEN lines are written and the tail drains THEN every line still arrives', async () => {
      h.fs.fail(DIR_WS, error);
      h.fs.append(P1, ENTRY_A);
      h.fs.append(P1, ENTRY_B);

      await started.tail.drain();

      expect(started.events).toStrictEqual([SEEN_A, SEEN_B]);
    });

    it("WHEN a second root's watcher fails too THEN still one line in the session", () => {
      h.start(ROOT_OTHER, P3);

      h.fs.fail(DIR_WS, error);
      h.fs.fail(DIR_OTHER, error);

      expect(h.fs.logs).toHaveLength(1);
    });

    it('WHEN a /ws tail starts after the failure THEN a new /ws watcher opens', () => {
      h.fs.fail(DIR_WS, error);

      h.start(ROOT_WS, P2);

      expect(h.fs.watchers.map((watcher) => [watcher.dir, watcher.closed])).toStrictEqual([
        [DIR_WS, true],
        [DIR_WS, false]
      ]);
    });
  });

  describe('GIVEN the /ws watcher fails before watch returns', () => {
    it('WHEN the tail starts THEN one line is logged, nothing is kept, and the next /ws tail opens a new watcher', () => {
      const error = new Error('EMFILE');

      h.fs.failNextWatch(error);
      h.start(ROOT_WS, P1);
      h.start(ROOT_WS, P2);

      expect([h.fs.watchers.map((watcher) => watcher.closed), h.fs.logs]).toStrictEqual([
        [true, false],
        [runLogWatchErrorText(DIR_WS, error)]
      ]);
    });
  });

  describe('GIVEN a /ws tail that drained and a newer /ws tail with its own watcher', () => {
    it('WHEN the first watcher reports an error THEN the newer watcher stays open', async () => {
      await h.start(ROOT_WS, P1).tail.drain();
      h.start(ROOT_WS, P2);

      h.fs.watchers[0]?.onError(new Error('EMFILE'));

      expect(h.fs.watchers.map((watcher) => watcher.closed)).toStrictEqual([true, false]);
    });
  });
});
