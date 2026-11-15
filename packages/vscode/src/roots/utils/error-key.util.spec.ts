import { TurboException } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { errorKeyOf } from './error-key.util.ts';
import type { LoadFailure } from '../common/root.type.ts';
import { LOAD_FAILURE_STUB } from '../test/stubs/root.stub.ts';

describe('FEATURE: error key of a load failure', () => {
  describe('GIVEN a binary not-found failure', () => {
    it('WHEN keyed THEN the key is binary:not-found', () => {
      const key = errorKeyOf(LOAD_FAILURE_STUB);

      expect(key).toBe('binary:not-found');
    });
  });

  describe('GIVEN a failed load', () => {
    it('WHEN keyed THEN the key is load:failed', () => {
      const error = new TurboException('failed', 'turbo exited 1');
      const failure: LoadFailure = { ...LOAD_FAILURE_STUB, stage: 'load', error };

      const key = errorKeyOf(failure);

      expect(key).toBe('load:failed');
    });
  });

  describe('GIVEN no failure', () => {
    it('WHEN keyed THEN the key is null', () => {
      const key = errorKeyOf(null);

      expect(key).toBeNull();
    });
  });
});
