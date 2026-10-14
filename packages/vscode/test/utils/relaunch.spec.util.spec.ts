import { describe, expect, it } from 'vitest';

import { shouldRelaunch } from './relaunch.spec.util.ts';

describe('FEATURE: shouldRelaunch', () => {
  describe('GIVEN a CI run', () => {
    it('WHEN the first attempt missed a timing budget THEN it relaunches', () => {
      const isRelaunch = shouldRelaunch(1, true, true);

      expect(isRelaunch).toBe(true);
    });

    it('WHEN the second attempt missed a timing budget THEN it relaunches', () => {
      const isRelaunch = shouldRelaunch(2, true, true);

      expect(isRelaunch).toBe(true);
    });

    it('WHEN the third attempt missed a timing budget THEN it does not relaunch', () => {
      const isRelaunch = shouldRelaunch(3, true, true);

      expect(isRelaunch).toBe(false);
    });

    it('WHEN the attempt failed without a timing miss THEN it does not relaunch', () => {
      const isRelaunch = shouldRelaunch(1, true, false);

      expect(isRelaunch).toBe(false);
    });
  });

  describe('GIVEN a local run', () => {
    it('WHEN the first attempt missed a timing budget THEN it does not relaunch', () => {
      const isRelaunch = shouldRelaunch(1, false, true);

      expect(isRelaunch).toBe(false);
    });
  });
});
