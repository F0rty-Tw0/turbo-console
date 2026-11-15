import { describe, expect, it } from 'vitest';

import { idleMs } from './timing.spec.util.ts';
import type { TimeRange, TurboRun } from '../common/launch.type.ts';

const WINDOW: TimeRange = { start: 100, end: 200 };

describe('FEATURE: idleMs', () => {
  describe('GIVEN one run', () => {
    it('WHEN the thread was idle all through it THEN its whole length counts', () => {
      const runs: TurboRun[] = [{ start: 120, end: 170, busyMs: 0 }];

      const idle = idleMs(runs, WINDOW);

      expect(idle).toBe(50);
    });

    it('WHEN the thread was blocked for part of it THEN only the idle part counts', () => {
      const runs: TurboRun[] = [{ start: 120, end: 170, busyMs: 30 }];

      const idle = idleMs(runs, WINDOW);

      expect(idle).toBe(20);
    });

    it('WHEN the window clips it THEN the idle share of the part inside counts', () => {
      const runs: TurboRun[] = [{ start: 50, end: 150, busyMs: 50 }];

      const idle = idleMs(runs, WINDOW);

      expect(idle).toBe(25);
    });

    it('WHEN it lies outside the window THEN nothing counts', () => {
      const runs: TurboRun[] = [{ start: 20, end: 90, busyMs: 0 }];

      const idle = idleMs(runs, WINDOW);

      expect(idle).toBe(0);
    });

    it('WHEN it has no length THEN nothing counts', () => {
      const runs: TurboRun[] = [{ start: 150, end: 150, busyMs: 0 }];

      const idle = idleMs(runs, WINDOW);

      expect(idle).toBe(0);
    });

    it('WHEN a coarse clock reports more busy time than its length THEN nothing counts', () => {
      const runs: TurboRun[] = [{ start: 120, end: 130, busyMs: 15.6 }];

      const idle = idleMs(runs, WINDOW);

      expect(idle).toBe(0);
    });
  });

  describe('GIVEN two runs', () => {
    it('WHEN one follows the other THEN both idle parts count', () => {
      const runs: TurboRun[] = [
        { start: 110, end: 130, busyMs: 5 },
        { start: 140, end: 180, busyMs: 10 }
      ];

      const idle = idleMs(runs, WINDOW);

      expect(idle).toBe(45);
    });

    it('WHEN they overlap THEN no more than the time they cover counts', () => {
      const runs: TurboRun[] = [
        { start: 110, end: 160, busyMs: 0 },
        { start: 110, end: 160, busyMs: 0 }
      ];

      const idle = idleMs(runs, WINDOW);

      expect(idle).toBe(50);
    });
  });
});
