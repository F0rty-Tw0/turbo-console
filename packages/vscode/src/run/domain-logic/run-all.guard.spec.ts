import { beforeEach, describe, expect, it } from 'vitest';

import { RunAllGuard } from './run-all.ts';
import type { RunAllClaim, RunAllDefinition } from '../common/run-all.type.ts';
import { runAllKey } from '../utils/run-all-task.util.ts';

const KEY = runAllKey('/ws', 'build', false);

const ENDED: RunAllDefinition = { root: '/ws', id: '*build', affected: false };

describe('FEATURE: run all guard', () => {
  let guard: RunAllGuard;

  beforeEach(() => {
    guard = new RunAllGuard();
  });

  describe('GIVEN a key was added', () => {
    beforeEach(() => {
      guard.tryAdd(KEY);
    });

    it('WHEN the same key is added again THEN it is refused', () => {
      const isAdded = guard.tryAdd(KEY);

      expect(isAdded).toBe(false);
    });

    it('WHEN another key is added THEN it is accepted', () => {
      const isAdded = guard.tryAdd(runAllKey('/ws', 'test', false));

      expect(isAdded).toBe(true);
    });

    it('WHEN its task ends with the same root, id and affected THEN the key is released', () => {
      guard.releaseOn(ENDED);

      expect(guard.tryAdd(KEY)).toBe(true);
    });

    it.each<[string, RunAllDefinition]>([
      ['affected', { ...ENDED, affected: true }],
      ['root', { ...ENDED, root: '/other' }],
      ['id', { ...ENDED, id: '*test' }]
    ])('WHEN a task ends with another %s THEN the key stays', (_field, definition) => {
      guard.releaseOn(definition);

      expect(guard.tryAdd(KEY)).toBe(false);
    });
  });

  describe('GIVEN a key was added and claimed', () => {
    let claim: RunAllClaim;

    beforeEach(() => {
      guard.tryAdd(KEY);
      claim = guard.claim(KEY);
    });

    it('WHEN no process started before it expires THEN the key is freed and the claim says so', () => {
      const isFreed = claim.expire();

      expect(isFreed).toBe(true);
      expect(guard.tryAdd(KEY)).toBe(true);
    });

    it('WHEN the process started before it expires THEN the key stays and the claim says nothing was freed', () => {
      guard.markStarted(ENDED);

      const isFreed = claim.expire();

      expect(isFreed).toBe(false);
      expect(guard.tryAdd(KEY)).toBe(false);
    });

    it('WHEN another task started its process THEN the claim still expires', () => {
      guard.markStarted({ ...ENDED, affected: true });

      expect(claim.expire()).toBe(true);
    });

    it('WHEN the launch settled before it expires THEN the key stays and the claim says nothing was freed', () => {
      claim.settle();

      const isFreed = claim.expire();

      expect(isFreed).toBe(false);
      expect(guard.tryAdd(KEY)).toBe(false);
    });

    it('WHEN it is released THEN the key is free', () => {
      claim.release();

      expect(guard.tryAdd(KEY)).toBe(true);
    });

    describe('AND the task ended and a newer launch took the key', () => {
      beforeEach(() => {
        guard.releaseOn(ENDED);
        guard.tryAdd(KEY);
      });

      it('WHEN the old claim expires THEN the newer launch is left alone', () => {
        const isFreed = claim.expire();

        expect(isFreed).toBe(false);
        expect(guard.tryAdd(KEY)).toBe(false);
      });

      it('WHEN the old claim is released THEN the newer launch keeps the key', () => {
        claim.release();

        expect(guard.tryAdd(KEY)).toBe(false);
      });

      it('WHEN the old claim settles THEN the newer launch can still expire', () => {
        const newer = guard.claim(KEY);

        claim.settle();

        expect(newer.expire()).toBe(true);
      });
    });
  });

  it('GIVEN no key was added WHEN a task ends THEN nothing changes and the key can be added', () => {
    guard.releaseOn(ENDED);

    expect(guard.tryAdd(KEY)).toBe(true);
  });
});
