import { TurboException } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { errorKeyOf } from './error-key.util.ts';
import type { LoadFailure } from '../common/root.type.ts';
import { LOAD_FAILURE_STUB } from '../test/stubs/root.stub.ts';

describe('FEATURE: error key of a load failure', () => {
  it('GIVEN a binary not-found failure WHEN keyed THEN the key is binary:not-found', () => {
    const key = errorKeyOf(LOAD_FAILURE_STUB);

    expect(key).toBe('binary:not-found');
  });

  it('GIVEN a failed load WHEN keyed THEN the key is load:failed', () => {
    const error = new TurboException('failed', 'turbo exited 1');
    const failure: LoadFailure = { ...LOAD_FAILURE_STUB, stage: 'load', error };

    const key = errorKeyOf(failure);

    expect(key).toBe('load:failed');
  });

  it('GIVEN no failure WHEN keyed THEN the key is null', () => {
    const key = errorKeyOf(null);

    expect(key).toBeNull();
  });
});
