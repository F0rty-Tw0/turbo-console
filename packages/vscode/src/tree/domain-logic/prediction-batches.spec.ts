import { beforeEach, describe, expect, it } from 'vitest';

import { PredictionBatches } from './prediction-batches.ts';
import type { PredictionTicket } from '../common/prediction.type.ts';
import { OTHER_ROOT, ROOT } from '../test/common/atom-load.const.ts';
import type { FakeClock } from '../test/common/prediction-clock.type.ts';
import { PKG_A, PKG_B } from '../test/common/prediction-load.const.ts';
import { fakeClock } from '../test/utils/prediction-clock.spec.util.ts';
import { packageNamesOf } from '../test/utils/prediction-model.spec.util.ts';

describe('FEATURE: prediction batches', () => {
  let clock: FakeClock;
  let sent: PredictionTicket[];
  let batches: PredictionBatches;

  const sentAt = (index: number): PredictionTicket => {
    const ticket = sent[index];

    if (ticket === undefined) throw new Error(`no ticket #${index}; ${sent.length} sent`);

    return ticket;
  };

  beforeEach(() => {
    clock = fakeClock();
    sent = [];
    batches = new PredictionBatches(clock, (ticket) => {
      sent.push(ticket);
    });
  });

  describe('GIVEN a root with no ticket', () => {
    it('WHEN a package joins THEN one 300 ms timer starts and nothing is sent', () => {
      batches.join(ROOT, PKG_A);

      expect(clock.timers.map((timer) => timer.ms)).toStrictEqual([300]);
      expect(sent).toStrictEqual([]);
    });

    it('WHEN a second package joins THEN it shares the ticket and the timer', () => {
      const first = batches.join(ROOT, PKG_A);
      const second = batches.join(ROOT, PKG_B);

      expect(second).toBe(first);
      expect([...second.members]).toStrictEqual([PKG_A, PKG_B]);
      expect(clock.timers).toHaveLength(1);
    });

    it('WHEN a package of another root joins THEN that root gets its own ticket and timer', () => {
      const first = batches.join(ROOT, PKG_A);
      const other = batches.join(OTHER_ROOT, PKG_A);

      expect(other).not.toBe(first);
      expect(clock.timers).toHaveLength(2);
    });

    it('WHEN the window is over THEN the ticket is sent and live', () => {
      const ticket = batches.join(ROOT, PKG_A);

      clock.fire();

      expect(sent).toStrictEqual([ticket]);
      expect(batches.isLive(ticket)).toBe(true);
    });

    it('WHEN the window is over THEN a later join opens a new window', () => {
      batches.join(ROOT, PKG_A);
      clock.fire();
      batches.join(ROOT, PKG_B);

      expect(clock.pendingTimers()).toHaveLength(1);
    });
  });

  describe('GIVEN a pending ticket', () => {
    it('WHEN its last member leaves THEN the timer is cancelled and nothing is sent', () => {
      const ticket = batches.join(ROOT, PKG_A);

      batches.leave(ticket, PKG_A);
      clock.fire();

      expect(clock.pendingTimers()).toStrictEqual([]);
      expect(sent).toStrictEqual([]);
    });

    it('WHEN one of two members leaves THEN the ticket is still sent', () => {
      const ticket = batches.join(ROOT, PKG_A);

      batches.join(ROOT, PKG_B);
      batches.leave(ticket, PKG_A);
      clock.fire();

      expect([...ticket.members]).toStrictEqual([PKG_B]);
      expect(sent).toStrictEqual([ticket]);
    });

    it('WHEN its last member left and another joins THEN a new ticket opens a new window', () => {
      const old = batches.join(ROOT, PKG_A);

      batches.leave(old, PKG_A);
      const next = batches.join(ROOT, PKG_B);

      expect(next).not.toBe(old);
      expect(clock.pendingTimers()).toHaveLength(1);
    });
  });

  describe('GIVEN a live ticket', () => {
    let live: PredictionTicket;

    beforeEach(() => {
      live = batches.join(ROOT, PKG_A);
      clock.fire();
    });

    describe('GIVEN the window of a second ticket ended', () => {
      let waiting: PredictionTicket;

      beforeEach(() => {
        waiting = batches.join(ROOT, PKG_B);
        clock.fire();
      });

      it('WHEN the live one is not finished THEN the second waits', () => {
        expect(sent).toStrictEqual([live]);
      });

      it('WHEN the live one finishes THEN the second is sent', () => {
        batches.finished(live);

        expect(sent).toStrictEqual([live, waiting]);
      });
    });

    it('WHEN it finishes with no waiting ticket THEN nothing is sent and it is no longer live', () => {
      batches.finished(live);

      expect(sent).toStrictEqual([live]);
      expect(batches.isLive(live)).toBe(false);
    });

    describe('GIVEN a second ticket still inside its window when the live one finishes', () => {
      let waiting: PredictionTicket;

      beforeEach(() => {
        waiting = batches.join(ROOT, PKG_B);
        batches.finished(live);
      });

      it('WHEN the window is not over THEN nothing more is sent', () => {
        expect(sent).toStrictEqual([live]);
      });

      it('WHEN the window ends THEN that window sends it', () => {
        clock.fire();

        expect(sent).toStrictEqual([live, waiting]);
      });
    });

    it('WHEN it finishes twice THEN the next ticket is sent once', () => {
      batches.join(ROOT, PKG_B);
      clock.fire();
      batches.finished(live);
      batches.finished(live);

      expect(sent).toHaveLength(2);
    });

    it('WHEN its last member leaves THEN it is aborted and the waiting ticket is sent at once', () => {
      const waiting = batches.join(ROOT, PKG_B);

      clock.fire();
      batches.leave(live, PKG_A);

      expect(live.controller.signal.aborted).toBe(true);
      expect(sent).toStrictEqual([live, waiting]);
    });

    it('WHEN its last member leaves and none waits THEN it is aborted and no longer live', () => {
      batches.leave(live, PKG_A);

      expect(live.controller.signal.aborted).toBe(true);
      expect(batches.isLive(live)).toBe(false);
    });

    it('WHEN one of two members leaves THEN it is not aborted', () => {
      live.members.add(PKG_B);
      batches.leave(live, PKG_A);

      expect(live.controller.signal.aborted).toBe(false);
      expect(batches.isLive(live)).toBe(true);
    });

    it('WHEN a member leaves after the ticket was finished THEN nothing is aborted', () => {
      batches.finished(live);
      batches.leave(live, PKG_A);

      expect(live.controller.signal.aborted).toBe(false);
    });
  });

  describe('GIVEN 120 packages joined in one window', () => {
    beforeEach(() => {
      for (const name of packageNamesOf(120)) batches.join(ROOT, name);

      clock.fire();
    });

    it('WHEN each run finishes THEN 50, 50 and 20 are sent one after another', () => {
      const sizes: number[] = [];

      sizes.push(sentAt(0).members.size);
      batches.finished(sentAt(0));
      sizes.push(sentAt(1).members.size);
      batches.finished(sentAt(1));
      sizes.push(sentAt(2).members.size);

      expect(sizes).toStrictEqual([50, 50, 20]);
      expect(sent).toHaveLength(3);
    });

    it('WHEN the first chunk is live THEN the other chunks are not sent and no new timer runs', () => {
      expect(sent).toHaveLength(1);
      expect(clock.pendingTimers()).toStrictEqual([]);
    });

    it('WHEN a package joins after the first chunk was sent THEN it joins the remainder without a timer', () => {
      const late = batches.join(ROOT, 'late');

      expect(late.members.size).toBe(71);
      expect(clock.pendingTimers()).toStrictEqual([]);
    });
  });

  describe('GIVEN exactly 50 packages in one window', () => {
    it('WHEN the window ends THEN the pending ticket itself is sent whole', () => {
      const [first = '', ...rest] = packageNamesOf(50);
      const ticket = batches.join(ROOT, first);

      for (const name of rest) batches.join(ROOT, name);

      clock.fire();

      expect(sent).toHaveLength(1);
      expect(sent[0]).toBe(ticket);
      expect(ticket.members.size).toBe(50);
    });

    it('WHEN the run finishes THEN nothing more is sent', () => {
      for (const name of packageNamesOf(50)) batches.join(ROOT, name);

      clock.fire();
      batches.finished(sentAt(0));

      expect(sent).toHaveLength(1);
    });
  });

  describe('GIVEN tickets in two roots', () => {
    it('WHEN both windows end THEN each root has its own live ticket at once', () => {
      const first = batches.join(ROOT, PKG_A);
      const other = batches.join(OTHER_ROOT, PKG_A);

      clock.fire();

      expect(sent).toStrictEqual([first, other]);
    });
  });

  describe('GIVEN a live ticket and a pending one in a root', () => {
    let live: PredictionTicket;
    let waiting: PredictionTicket;

    beforeEach(() => {
      live = batches.join(ROOT, PKG_A);
      clock.fire();
      waiting = batches.join(ROOT, PKG_B);
    });

    it('WHEN the root is dropped THEN the timer is cancelled and the live ticket is aborted', () => {
      batches.dropRoot(ROOT);
      clock.fire();

      expect(live.controller.signal.aborted).toBe(true);
      expect(clock.pendingTimers()).toStrictEqual([]);
      expect(sent).toStrictEqual([live]);
    });

    it('WHEN a member of the dropped pending ticket leaves THEN nothing happens', () => {
      batches.dropRoot(ROOT);
      batches.leave(waiting, PKG_B);

      expect(sent).toStrictEqual([live]);
    });

    it('WHEN another root is dropped THEN this root keeps its tickets', () => {
      batches.dropRoot(OTHER_ROOT);
      batches.finished(live);
      clock.fire();

      expect(live.controller.signal.aborted).toBe(false);
      expect(sent).toStrictEqual([live, waiting]);
    });

    it('WHEN everything is cleared THEN every timer is cancelled and every live ticket is aborted', () => {
      const other = batches.join(OTHER_ROOT, PKG_A);

      clock.fire();
      batches.clear();

      expect(live.controller.signal.aborted).toBe(true);
      expect(other.controller.signal.aborted).toBe(true);
      expect(clock.pendingTimers()).toStrictEqual([]);
    });
  });
});
