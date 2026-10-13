import { describe, expect, it } from 'vitest';

import { errnoCode, isMissing } from './errno.util.ts';

const errnoError = (code: unknown): Error => Object.assign(new Error('boom'), { code });

describe('FEATURE: errno code reading', () => {
  describe('GIVEN an error with a string code', () => {
    it('WHEN its code is read THEN it is returned', () => {
      expect(errnoCode(errnoError('EACCES'))).toBe('EACCES');
    });
  });

  describe('GIVEN an error whose code is not a string, or no error at all', () => {
    it('WHEN its code is read THEN it is undefined', () => {
      expect(errnoCode(errnoError(13))).toBeUndefined();
      expect(errnoCode('ENOENT')).toBeUndefined();
    });
  });

  describe('GIVEN errors from a lookup', () => {
    it('WHEN the path or a parent is absent (ENOENT, ENOTDIR) THEN it is missing', () => {
      expect(isMissing(errnoError('ENOENT'))).toBe(true);
      expect(isMissing(errnoError('ENOTDIR'))).toBe(true);
    });

    it('WHEN access is denied THEN it is not missing', () => {
      expect(isMissing(errnoError('EACCES'))).toBe(false);
    });
  });
});
