import { describe, expect, it } from 'vitest';

import { assertRunExtras } from './run-extras.util.ts';
import type { RunExtras } from '../common/run-args.type.ts';

const VALID: RunExtras[] = [
  {},
  { only: true },
  { continueMode: 'dependencies-successful' },
  { concurrency: '1' },
  { concurrency: '150%' },
  { passThrough: [] },
  { passThrough: ['--watch', '--port=3000', './src/a.ts', '--env=dev:local'] }
];

const messageOf = (extras: RunExtras): string => {
  try {
    assertRunExtras(extras);
  } catch (error) {
    return error instanceof Error ? error.message : '';
  }

  return '';
};

describe('FEATURE: run extras check', () => {
  describe('GIVEN valid extras', () => {
    it.each(VALID)('WHEN %j is checked THEN it does not throw', (extras) => {
      expect(() => assertRunExtras(extras)).not.toThrow();
    });
  });

  describe('GIVEN a bad concurrency', () => {
    it('WHEN it is 0 THEN it throws invalid-argument naming the concurrency', () => {
      expect(() => assertRunExtras({ concurrency: '0' })).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
      expect(() => assertRunExtras({ concurrency: '0' })).toThrow('invalid concurrency "0"');
    });
  });

  describe('GIVEN a bad pass-through arg', () => {
    it('WHEN the second arg holds a space THEN the message names argument 2 and its value', () => {
      expect(() => assertRunExtras({ passThrough: ['--ok', 'a b'] })).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
      expect(() => assertRunExtras({ passThrough: ['--ok', 'a b'] })).toThrow('argument 2 "a b"');
    });

    it('WHEN the first arg starts with = THEN the message names argument 1', () => {
      expect(() => assertRunExtras({ passThrough: ['=x'] })).toThrow('argument 1 "=x"');
    });

    it('WHEN the arg is 300 characters THEN the message echoes a cut value', () => {
      const message = messageOf({ passThrough: ['$'.repeat(300)] });

      expect(message.length).toBeLessThan(400);
    });
  });
});
