import { describe, expect, it } from 'vitest';

import { abortGraceMs } from './abort-grace.util.ts';
import { MemoryLimitError } from '../common/memory-limit.exception.ts';

describe('FEATURE: kill grace for an aborted turbo child', () => {
  describe('GIVEN a memory-limit reason', () => {
    it('WHEN the platform is linux THEN there is no grace', () => {
      const grace = abortGraceMs(new MemoryLimitError(1, 2), 'linux', 5000);

      expect(grace).toBe(0);
    });

    it('WHEN the platform is win32 THEN the configured grace stays, so taskkill can walk the tree', () => {
      const grace = abortGraceMs(new MemoryLimitError(1, 2), 'win32', 5000);

      expect(grace).toBe(5000);
    });
  });

  describe('GIVEN a reason that is not a memory limit', () => {
    it('WHEN it is a timeout THEN the configured grace stays', () => {
      const grace = abortGraceMs(new DOMException('timed out', 'TimeoutError'), 'linux', 5000);

      expect(grace).toBe(5000);
    });

    it('WHEN it is undefined THEN the configured grace stays', () => {
      const grace = abortGraceMs(undefined, 'linux', 5000);

      expect(grace).toBe(5000);
    });
  });
});
