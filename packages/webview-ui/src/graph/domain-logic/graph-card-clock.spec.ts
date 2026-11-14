import type { Mock, Mocked } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphCardClock } from './graph-card-clock.ts';
import type { CardClockDeps } from '../common/card-clock.type.ts';
import type { TaskCanvas } from '../common/task-canvas.type.ts';

const TIMER_ID = 7;

const RUNNING = { a: 64_000 };

describe('FEATURE: GraphCardClock', () => {
  let t: number;
  let hidden: boolean;
  let fire: () => void;
  let canvas: Mocked<Pick<TaskCanvas, 'clocks'>>;
  let setInterval: Mock<CardClockDeps['setInterval']>;
  let clearInterval: Mock<CardClockDeps['clearInterval']>;
  let clock: GraphCardClock;

  beforeEach(() => {
    t = 1000;
    hidden = false;
    fire = (): void => undefined;
    canvas = { clocks: vi.fn<TaskCanvas['clocks']>() };
    setInterval = vi.fn<CardClockDeps['setInterval']>((fn: () => void): number => {
      fire = fn;

      return TIMER_ID;
    });
    clearInterval = vi.fn<CardClockDeps['clearInterval']>();
    clock = new GraphCardClock({ canvas, now: (): number => t, setInterval, clearInterval, isHidden: (): boolean => hidden });
  });

  describe('GIVEN an empty clock', () => {
    it('WHEN runs names a task THEN one 1000 ms interval is armed', () => {
      clock.runs(RUNNING, 1000);

      expect(setInterval).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 1000);
    });

    it('WHEN runs names a task THEN its text is written', () => {
      clock.runs(RUNNING, 1000);

      expect(canvas.clocks).toHaveBeenLastCalledWith({ a: '1m 4s' });
    });

    it('WHEN runs arrives with no clock and none was written THEN clocks is not called', () => {
      clock.runs(undefined, 1000);

      expect(canvas.clocks).not.toHaveBeenCalled();
    });

    it('WHEN shown with no base THEN nothing is written', () => {
      clock.shown();

      expect(canvas.clocks).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a task clocked at 64 s', () => {
    beforeEach(() => {
      clock.runs(RUNNING, 1000);
    });

    it('WHEN a second runs message arrives while a base exists THEN no second interval is armed', () => {
      clock.runs({ a: 65_000 }, 2000);

      expect(setInterval).toHaveBeenCalledOnce();
    });

    it('WHEN a second passes THEN a tick writes the extrapolated text', () => {
      t = 2000;
      fire();

      expect(canvas.clocks).toHaveBeenLastCalledWith({ a: '1m 5s' });
    });

    it.each([
      ['undefined', undefined],
      ['an empty record', {}]
    ])('WHEN runs arrives with %s THEN clocks are cleared and the interval cleared once', (_name, elapsed) => {
      clock.runs(elapsed, 1500);

      expect(canvas.clocks).toHaveBeenLastCalledWith({});
      expect(clearInterval).toHaveBeenCalledExactlyOnceWith(TIMER_ID);
    });

    it('WHEN the last base went and runs names one again THEN a second interval is armed', () => {
      clock.runs(undefined, 1500);
      clock.runs(RUNNING, 2000);

      expect(setInterval).toHaveBeenCalledTimes(2);
    });

    it('WHEN the same runs and elapsed arrive again at the same instant THEN clocks is written once', () => {
      clock.runs(RUNNING, 1000);

      expect(canvas.clocks).toHaveBeenCalledOnce();
    });

    it('WHEN a later runs names other ids THEN the old base is dropped', () => {
      clock.runs({ b: 2000 }, 1000);

      expect(canvas.clocks).toHaveBeenLastCalledWith({ b: '2s' });
    });

    it('WHEN runs corrects drift THEN the new base wins', () => {
      t = 2000;
      clock.runs({ a: 70_000 }, 2000);

      expect(canvas.clocks).toHaveBeenLastCalledWith({ a: '1m 10s' });
    });

    it('WHEN the page is hidden and a tick fires THEN nothing is written', () => {
      canvas.clocks.mockClear();
      hidden = true;
      t = 2000;
      fire();

      expect(canvas.clocks).not.toHaveBeenCalled();
    });

    it('WHEN hidden for five minutes and shown THEN the first write is the caught-up time', () => {
      hidden = true;
      t = 301_000;
      fire();
      hidden = false;
      clock.shown();

      expect(canvas.clocks).toHaveBeenLastCalledWith({ a: '6m 4s' });
    });

    it('WHEN shown while still hidden THEN nothing is written', () => {
      canvas.clocks.mockClear();
      hidden = true;
      t = 301_000;
      clock.shown();

      expect(canvas.clocks).not.toHaveBeenCalled();
    });
  });
});
