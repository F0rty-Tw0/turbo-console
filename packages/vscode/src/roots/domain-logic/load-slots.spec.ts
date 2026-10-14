import { getEventListeners } from 'node:events';

import { describe, expect, it } from 'vitest';

import { LoadSlots } from './load-slots.ts';
import { stateOf } from '../test/utils/promise-state.spec.util.ts';

const LIVE = new AbortController().signal;

describe('FEATURE: load slots', () => {
  describe('GIVEN two slots', () => {
    it('WHEN three loads ask THEN the first two get a slot and the third waits', async () => {
      const slots = new LoadSlots(2);

      const asks = [slots.acquire(LIVE), slots.acquire(LIVE), slots.acquire(LIVE)];
      const states = await Promise.all(asks.map(stateOf));

      expect(states).toStrictEqual(['granted', 'granted', 'waiting']);
    });

    it('WHEN a holder releases THEN the first waiter gets the slot before the second', async () => {
      const slots = new LoadSlots(2);
      const release = await slots.acquire(LIVE);

      await slots.acquire(LIVE);

      const first = slots.acquire(LIVE);
      const second = slots.acquire(LIVE);

      release();

      const states = [await stateOf(first), await stateOf(second)];

      expect(states).toStrictEqual(['granted', 'waiting']);
    });

    it('WHEN a holder releases twice THEN only one slot is freed', async () => {
      const slots = new LoadSlots(2);
      const release = await slots.acquire(LIVE);

      await slots.acquire(LIVE);
      release();
      release();

      const asks = [slots.acquire(LIVE), slots.acquire(LIVE)];
      const states = await Promise.all(asks.map(stateOf));

      expect(states).toStrictEqual(['granted', 'waiting']);
    });

    it('WHEN a holder releases twice THEN no release throws', async () => {
      const slots = new LoadSlots(2);
      const release = await slots.acquire(LIVE);

      release();

      expect(release).not.toThrow();
    });
  });

  describe('GIVEN one slot held and a waiter queued', () => {
    it('WHEN the waiter aborts THEN it rejects with the abort reason', async () => {
      const slots = new LoadSlots(1);
      const controller = new AbortController();

      await slots.acquire(LIVE);

      const waiter = slots.acquire(controller.signal);

      controller.abort('superseded');

      await expect(waiter).rejects.toBe('superseded');
    });

    it('WHEN the waiter aborts and the holder releases THEN the next live waiter gets the slot', async () => {
      const slots = new LoadSlots(1);
      const controller = new AbortController();
      const release = await slots.acquire(LIVE);
      const aborted = slots.acquire(controller.signal);
      const live = slots.acquire(LIVE);

      controller.abort('superseded');
      await aborted.catch(() => undefined);
      release();

      const state = await stateOf(live);

      expect(state).toBe('granted');
    });
  });

  describe('GIVEN one free slot', () => {
    it('WHEN an already aborted load asks THEN it rejects at once with the reason', async () => {
      const slots = new LoadSlots(1);
      const signal = AbortSignal.abort('gone');

      const ask = slots.acquire(signal);

      await expect(ask).rejects.toBe('gone');
    });

    it('WHEN an already aborted load asks THEN it takes no slot', async () => {
      const slots = new LoadSlots(1);
      const signal = AbortSignal.abort('gone');

      const ask = slots.acquire(signal);

      await ask.catch(() => undefined);

      const state = await stateOf(slots.acquire(LIVE));

      expect(state).toBe('granted');
    });
  });

  describe('GIVEN one slot held and a waiter queued on its own signal', () => {
    it('WHEN the waiter is granted THEN it stops listening for an abort', async () => {
      const slots = new LoadSlots(1);
      const release = await slots.acquire(LIVE);
      const controller = new AbortController();
      const waiting = slots.acquire(controller.signal);

      release();
      await waiting;

      expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
    });

    it('WHEN the waiter aborts after its grant THEN its slot stays held', async () => {
      const slots = new LoadSlots(1);
      const release = await slots.acquire(LIVE);
      const controller = new AbortController();
      const waiting = slots.acquire(controller.signal);

      release();
      await waiting;
      controller.abort();

      const next = slots.acquire(LIVE);

      expect(await stateOf(next)).toBe('waiting');
    });
  });
});
