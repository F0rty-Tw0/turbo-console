import { TurboException } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { readUnlessFailed } from './read-unless-failed.util.ts';
import type { Resolved } from '../common/root.type.ts';
import { TURBO_BINARY_STUB } from '../test/stubs/root.stub.ts';
import { loadFailureOf } from '../test/utils/load-failure.spec.util.ts';

const FAILED: Resolved = loadFailureOf('binary', new TurboException('not-found', 'no turbo'));

const BOUND: Resolved = { kind: 'binary', binary: TURBO_BINARY_STUB };

const never = async <T>(): Promise<T> => new Promise<T>(() => undefined);

describe('FEATURE: a cache read raced against a failing resolve', () => {
  describe('GIVEN a read that never returns', () => {
    it('WHEN the resolve fails THEN it settles with that failure', async () => {
      const raced = readUnlessFailed(never<string>(), Promise.resolve(FAILED));

      await expect(raced).resolves.toBe(FAILED);
    });
  });

  describe('GIVEN a read that returns', () => {
    it('WHEN the resolve succeeds first THEN it settles with the read', async () => {
      const reading = Promise.withResolvers<string>();
      const raced = readUnlessFailed(reading.promise, Promise.resolve(BOUND));

      reading.resolve('cached');

      await expect(raced).resolves.toBe('cached');
    });

    it('WHEN the resolve never settles THEN it settles with the read', async () => {
      const raced = readUnlessFailed(Promise.resolve('cached'), never<Resolved>());

      await expect(raced).resolves.toBe('cached');
    });
  });

  it('GIVEN a read that rejects WHEN the resolve succeeds THEN it rejects with the read error', async () => {
    const raced = readUnlessFailed(Promise.reject(new Error('boom')), Promise.resolve(BOUND));

    await expect(raced).rejects.toThrow('boom');
  });
});
