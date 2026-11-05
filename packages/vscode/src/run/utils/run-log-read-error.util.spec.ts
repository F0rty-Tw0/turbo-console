import { describe, expect, it } from 'vitest';

import { isRetryableReadError } from './run-log-read-error.util.ts';

const errorWithCode = (code: string): Error => Object.assign(new Error(code), { code });

describe('FEATURE: retryable log read errors (spec D5)', () => {
  describe('GIVEN a read error with a code', () => {
    it.each(['ENOENT', 'EBUSY', 'EPERM', 'EMFILE', 'ENFILE', 'EAGAIN'])('WHEN the code is %s THEN it is retried', (code) => {
      expect(isRetryableReadError(errorWithCode(code))).toBe(true);
    });

    it.each(['EISDIR', 'EIO', 'EACCES'])('WHEN the code is %s THEN it is not retried', (code) => {
      expect(isRetryableReadError(errorWithCode(code))).toBe(false);
    });
  });

  describe('GIVEN a failure without a code', () => {
    it('WHEN it is a plain Error THEN it is not retried', () => {
      expect(isRetryableReadError(new Error('boom'))).toBe(false);
    });

    it('WHEN it is not an Error THEN it is not retried', () => {
      expect(isRetryableReadError({ code: 'ENOENT' })).toBe(false);
    });
  });
});
