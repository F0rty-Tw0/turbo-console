import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RunLogTails } from './run-log-tails.ts';
import { flush } from '../../tree/test/utils/atom-load.spec.util.ts';
import { RUN_LOG_SWEEP_AGE_MS } from '../common/run-log-tail.const.ts';
import type { RunLogPorts } from '../common/run-log-tail.type.ts';
import { SEEN_A } from '../test/common/run-log-fs.const.ts';
import { ENTRY_A } from '../test/common/run-log-step.const.ts';
import { ROOT_OTHER, ROOT_WS } from '../test/common/run-log-tails.const.ts';
import type { TailsHarness } from '../test/common/run-log-tails.type.ts';
import { endChangeWindow, fakeChangeWindows } from '../test/utils/run-log-change-window.spec.util.ts';
import { logPathOf, tailsHarnessOf } from '../test/utils/run-log-tails.spec.util.ts';
import { runLogDirOf } from '../utils/run-log-dir.util.ts';

const tailsOf = (ports: RunLogPorts): RunLogTails => new RunLogTails(ports);

const HOUR_MS = RUN_LOG_SWEEP_AGE_MS / 24;

const OLD = logPathOf(ROOT_WS, 'run-old.json');
const YOUNG = logPathOf(ROOT_WS, 'run-young.json');
const NOTES = logPathOf(ROOT_WS, 'notes.txt');
const NEW = logPathOf(ROOT_WS, 'run-new.json');
const OLDER = logPathOf(ROOT_WS, 'run-older.json');
const OTHER_OLD = logPathOf(ROOT_OTHER, 'run-old.json');

describe('FEATURE: sweep stale turbo log files (spec D6)', () => {
  beforeEach(() => {
    fakeChangeWindows();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const ageOf = (h: TailsHarness, path: string, hours: number): void => {
    h.fs.write(path, []);
    h.fs.mtimes.set(path, h.fs.nowMs - hours * HOUR_MS);
  };

  describe("GIVEN run-old.json (25 h), run-young.json (23 h), notes.txt (25 h) and the new tail's file (25 h)", () => {
    let h: TailsHarness;

    beforeEach(() => {
      h = tailsHarnessOf(tailsOf);
      ageOf(h, OLD, 25);
      ageOf(h, YOUNG, 23);
      ageOf(h, NOTES, 25);
      ageOf(h, NEW, 25);
      ageOf(h, OTHER_OLD, 25);
    });

    it('WHEN the first /ws tail starts THEN only run-old.json is removed', async () => {
      h.start(ROOT_WS, NEW);
      await endChangeWindow();

      expect(h.fs.removed).toStrictEqual([OLD]);
    });

    it('WHEN the first /other tail starts THEN /other is swept', async () => {
      h.start(ROOT_OTHER, logPathOf(ROOT_OTHER, 'run-new.json'));
      await endChangeWindow();

      expect(h.fs.removed).toStrictEqual([OTHER_OLD]);
    });
  });

  describe('GIVEN two old files and a remove that rejects for the first', () => {
    it('WHEN the first /ws tail starts THEN the second is still removed and nothing is logged', async () => {
      const attempted: string[] = [];
      const remove: RunLogPorts['remove'] = async (path) => {
        attempted.push(path);

        if (path === OLD) return Promise.reject(new Error('EBUSY'));

        return Promise.resolve();
      };
      const h = tailsHarnessOf(tailsOf, { remove });

      ageOf(h, OLD, 25);
      ageOf(h, OLDER, 25);
      h.start(ROOT_WS, NEW);
      await endChangeWindow();

      expect([attempted, h.fs.logs]).toStrictEqual([[OLD, OLDER], []]);
    });
  });

  describe('GIVEN an old file whose mtime is held and a second tail that starts on it meanwhile', () => {
    it('WHEN the mtime is released THEN the file is not removed', async () => {
      const gate = Promise.withResolvers<undefined>();
      const modifiedAt: RunLogPorts['modifiedAt'] = async (path) => {
        await gate.promise;

        return path === OLD ? 0 : null;
      };
      const h = tailsHarnessOf(tailsOf, { modifiedAt });

      h.fs.write(OLD, []);
      h.start(ROOT_WS, NEW);
      await flush();
      h.start(ROOT_WS, OLD);
      gate.resolve(undefined);
      await endChangeWindow();

      expect(h.fs.removed).toStrictEqual([]);
    });
  });

  describe('GIVEN a counted listing', () => {
    it('WHEN a second /ws tail starts THEN no second sweep lists the folder', async () => {
      const list = vi.fn<RunLogPorts['list']>(async () => Promise.resolve([]));
      const h = tailsHarnessOf(tailsOf, { list });

      h.start(ROOT_WS, logPathOf(ROOT_WS, 'run-1.json'));
      h.start(ROOT_WS, logPathOf(ROOT_WS, 'run-2.json'));
      await endChangeWindow();

      expect(list.mock.calls).toStrictEqual([[runLogDirOf(ROOT_WS)]]);
    });
  });

  describe('GIVEN a listing that fails', () => {
    it('WHEN the tail starts THEN it still reads and nothing is logged', async () => {
      const list: RunLogPorts['list'] = async () => Promise.reject(new Error('EACCES'));
      const h = tailsHarnessOf(tailsOf, { list });

      h.fs.write(NEW, [ENTRY_A]);
      const started = h.start(ROOT_WS, NEW);

      await endChangeWindow();

      expect([started.events, h.fs.logs]).toStrictEqual([[SEEN_A], []]);
    });
  });
});
