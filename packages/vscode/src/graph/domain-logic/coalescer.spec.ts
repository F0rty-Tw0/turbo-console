import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { Coalescer } from './coalescer.ts';

const DELAY_MS = 50;

describe('FEATURE: Coalescer', () => {
  let fire: Mock<() => void>;
  let coalescer: Coalescer;

  beforeEach(() => {
    vi.useFakeTimers();
    fire = vi.fn<() => void>();
    coalescer = new Coalescer(DELAY_MS, fire);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GIVEN an armed coalescer', () => {
    beforeEach(() => {
      coalescer.arm();
    });

    it('WHEN it is armed twice more within the delay THEN it fires once', () => {
      coalescer.arm();
      coalescer.arm();
      vi.advanceTimersByTime(DELAY_MS);

      expect(fire).toHaveBeenCalledOnce();
    });

    it('WHEN less than the delay elapses THEN it has not fired', () => {
      vi.advanceTimersByTime(DELAY_MS - 1);

      expect(fire).not.toHaveBeenCalled();
    });

    it('WHEN it is cancelled THEN it never fires', () => {
      coalescer.cancel();
      vi.advanceTimersByTime(DELAY_MS);

      expect(fire).not.toHaveBeenCalled();
    });

    it('WHEN it is cancelled and armed again THEN it fires once a delay after the new arm', () => {
      vi.advanceTimersByTime(DELAY_MS - 1);
      coalescer.cancel();
      coalescer.arm();
      vi.advanceTimersByTime(DELAY_MS);

      expect(fire).toHaveBeenCalledOnce();
    });

    it('WHEN it fires and is armed again THEN it fires a second time', () => {
      vi.advanceTimersByTime(DELAY_MS);
      coalescer.arm();
      vi.advanceTimersByTime(DELAY_MS);

      expect(fire).toHaveBeenCalledTimes(2);
    });
  });

  describe('GIVEN an idle coalescer', () => {
    it('WHEN it is cancelled THEN a later arm still fires', () => {
      coalescer.cancel();
      coalescer.arm();
      vi.advanceTimersByTime(DELAY_MS);

      expect(fire).toHaveBeenCalledOnce();
    });
  });
});
