import { expect as playwrightExpect } from '@playwright/test';
import { describe, expect, it } from 'vitest';

import { isPollTimeout } from './poll-timeout.util.ts';

const caught = async (poll: () => Promise<void>): Promise<unknown> => {
  try {
    await poll();
  } catch (error) {
    return error;
  }

  throw new Error('the poll did not throw');
};

describe('FEATURE: poll timeout', () => {
  describe('GIVEN an expect.poll that never reaches its value', () => {
    it('WHEN it runs out of time THEN its error is a poll timeout', async () => {
      const never = async (): Promise<void> =>
        playwrightExpect.poll(async (): Promise<boolean> => Promise.resolve(false), { timeout: 50 }).toBe(true);

      const error = await caught(never);

      expect(isPollTimeout(error)).toBe(true);
    });
  });

  describe('GIVEN an expect.poll whose reader throws', () => {
    it('WHEN it runs THEN its error is not a poll timeout', async () => {
      const reader = async (): Promise<boolean> => Promise.reject(new Error('Target page, context or browser has been closed'));
      const broken = async (): Promise<void> => playwrightExpect.poll(reader, { timeout: 50 }).toBe(true);

      const error = await caught(broken);

      expect(isPollTimeout(error)).toBe(false);
    });
  });

  describe('GIVEN a value that is not an error', () => {
    it('WHEN it is checked THEN it is not a poll timeout', () => {
      expect(isPollTimeout('exceeded while waiting on the predicate')).toBe(false);
    });
  });
});
