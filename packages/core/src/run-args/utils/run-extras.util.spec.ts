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

const GOOD_CONCURRENCY = ['1', '50%', '150%', '999999999'];

const BAD_CONCURRENCY = ['0', '01', '-1', 'abc', '1.5', '0%', '', ' 2', '4294967296'];

const BAD_ARGS = ['a b', '$HOME', "it's", 'a,b', '@scope/x', '=x', '', 'a\n'];

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

    it.each(GOOD_CONCURRENCY)('WHEN concurrency is %j THEN it does not throw', (concurrency) => {
      expect(() => assertRunExtras({ concurrency })).not.toThrow();
    });
  });

  describe('GIVEN a bad concurrency', () => {
    it('WHEN it is 0 THEN it throws invalid-argument naming the concurrency', () => {
      expect(() => assertRunExtras({ concurrency: '0' })).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
      expect(() => assertRunExtras({ concurrency: '0' })).toThrow('invalid concurrency "0"');
    });

    it.each(BAD_CONCURRENCY)('WHEN it is %j THEN it throws invalid-argument', (concurrency) => {
      expect(() => assertRunExtras({ concurrency })).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
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

    it.each(BAD_ARGS)('WHEN the second arg is %j THEN it throws invalid-argument', (arg) => {
      expect(() => assertRunExtras({ passThrough: ['--ok', arg] })).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
    });

    it('WHEN the arg is 300 characters THEN the message echoes its first 200', () => {
      const message = messageOf({ passThrough: ['$'.repeat(300)] });
      const first200 = JSON.stringify('$'.repeat(200));

      expect(message).toContain(first200);
    });

    it('WHEN the arg is 300 characters THEN the message echoes no 201st character', () => {
      const message = messageOf({ passThrough: ['$'.repeat(300)] });

      expect(message).not.toContain('$'.repeat(201));
    });
  });
});
