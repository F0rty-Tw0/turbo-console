import { describe, expect, it } from 'vitest';

import { RunLogTails } from './run-log-tails.ts';
import { flush } from '../../tree/test/utils/atom-load.spec.util.ts';
import { RUN_LOG_FAILED_TEXT, RUN_LOG_MISSING_TEXT, RUN_LOG_UNKNOWN_TEXT } from '../common/run-log-tail.const.ts';
import type { RunLogPorts, RunLogTail } from '../common/run-log-tail.type.ts';
import { ENTRY_A, INVALID_OBJECT } from '../test/common/run-log-step.const.ts';
import { ROOT_WS } from '../test/common/run-log-tails.const.ts';
import { logPathOf, tailsHarnessOf } from '../test/utils/run-log-tails.spec.util.ts';

const tailsOf = (ports: RunLogPorts): RunLogTails => new RunLogTails(ports);

const P1 = logPathOf(ROOT_WS, 'run-1.json');
const P2 = logPathOf(ROOT_WS, 'run-2.json');

type Ending = (tail: RunLogTail) => Promise<void>;

const drained: Ending = async (tail) => tail.drain();

const closed: Ending = async (tail) => {
  tail.close();
  await flush();
};

describe('FEATURE: end a turbo log tail (spec D5, D6, D10)', () => {
  describe('GIVEN files never written', () => {
    it('WHEN two tails drain THEN the D6 line is logged once', async () => {
      const h = tailsHarnessOf(tailsOf);
      const first = h.start(ROOT_WS, P1);
      const second = h.start(ROOT_WS, P2);

      await first.tail.drain();
      await second.tail.drain();

      expect(h.fs.logs).toStrictEqual([RUN_LOG_MISSING_TEXT]);
    });

    it('WHEN a tail is closed THEN no line is logged', async () => {
      const h = tailsHarnessOf(tailsOf);

      await closed(h.start(ROOT_WS, P1).tail);

      expect(h.fs.logs).toStrictEqual([]);
    });

    it('WHEN closed while its drain is pending THEN the drain resolves, no line is logged, the file is removed once', async () => {
      const h = tailsHarnessOf(tailsOf);
      const release = h.fs.hold();
      const started = h.start(ROOT_WS, P1);

      const draining = started.tail.drain();

      started.tail.close();
      release();
      await draining;
      await flush();

      expect([h.fs.logs, h.fs.removed]).toStrictEqual([[], [P1]]);
    });
  });

  describe('GIVEN two unknown-format files', () => {
    it('WHEN both drain THEN the unknown line is logged once', async () => {
      const h = tailsHarnessOf(tailsOf);

      h.fs.write(P1, [INVALID_OBJECT, INVALID_OBJECT, INVALID_OBJECT]);
      h.fs.write(P2, [INVALID_OBJECT, INVALID_OBJECT, INVALID_OBJECT]);
      const first = h.start(ROOT_WS, P1);
      const second = h.start(ROOT_WS, P2);

      await first.tail.drain();
      await second.tail.drain();

      expect(h.fs.logs).toStrictEqual([RUN_LOG_UNKNOWN_TEXT]);
    });
  });

  describe('GIVEN two tails whose reads reject', () => {
    it('WHEN both drain THEN the failed line is logged once', async () => {
      const read: RunLogPorts['read'] = async () => Promise.reject(new Error('disk gone'));
      const h = tailsHarnessOf(tailsOf, { read });
      const first = h.start(ROOT_WS, P1);
      const second = h.start(ROOT_WS, P2);

      await first.tail.drain();
      await second.tail.drain();

      expect(h.fs.logs).toStrictEqual([RUN_LOG_FAILED_TEXT]);
    });
  });

  describe('GIVEN a tail that ends', () => {
    it.each([
      ['drained', drained],
      ['closed', closed]
    ])('WHEN %s THEN its file is removed', async (_, ending) => {
      const h = tailsHarnessOf(tailsOf);

      h.fs.write(P1, [ENTRY_A]);
      await ending(h.start(ROOT_WS, P1).tail);

      expect(h.fs.removed).toStrictEqual([P1]);
    });

    it('WHEN closed with a read held in flight THEN the file is removed only after the read resolves', async () => {
      const h = tailsHarnessOf(tailsOf);
      const release = h.fs.hold();
      const started = h.start(ROOT_WS, P1);

      started.tail.close();
      await flush();
      const removedWhileHeld = [...h.fs.removed];

      release();
      await flush();

      expect([removedWhileHeld, h.fs.removed]).toStrictEqual([[], [P1]]);
    });

    it('WHEN the remove fails THEN nothing is logged and nothing throws', async () => {
      const remove: RunLogPorts['remove'] = async () => Promise.reject(new Error('EBUSY'));
      const h = tailsHarnessOf(tailsOf, { remove });

      h.fs.write(P1, [ENTRY_A]);
      const started = h.start(ROOT_WS, P1);

      await expect(started.tail.drain()).resolves.toBeUndefined();
      expect(h.fs.logs).toStrictEqual([]);
    });
  });
});
