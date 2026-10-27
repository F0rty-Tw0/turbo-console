import type { RunMatch } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { RunStore } from './run-store.ts';
import type { RunDefinition } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const INTERRUPTED: RunMatch = { cache: null, durationMs: 1400, interrupted: true };

const COMPLETE: RunMatch = { cache: 'MISS', durationMs: 1400, interrupted: false };

describe('FEATURE: run store, B2-1 a turbo run whose summary says it was interrupted', () => {
  let store: RunStore;

  beforeEach(() => {
    store = new RunStore();
    store.tryStart(RUN_REQUEST_STUB, 1000);
  });

  describe('GIVEN a run that passed (exit 0) and waits for its match', () => {
    beforeEach(() => {
      store.processEnded(RUN, 0, 4000);
    });

    it('WHEN its match is interrupted (Ctrl+C in its terminal) THEN it is stopped, not passed', () => {
      store.setMatch(RUN, 1000, INTERRUPTED);

      expect(store.get('/ws', 'build')).toMatchObject({ state: 'stopped', match: INTERRUPTED, matching: false });
    });

    it('WHEN its match is not interrupted THEN it stays passed', () => {
      store.setMatch(RUN, 1000, COMPLETE);

      expect(store.get('/ws', 'build')).toMatchObject({ state: 'passed', match: COMPLETE, matching: false });
    });

    it('WHEN no match is found THEN it stays passed', () => {
      store.setMatch(RUN, 1000, null);

      expect(store.get('/ws', 'build')?.state).toBe('passed');
    });
  });

  describe('GIVEN a run that failed (exit 1) and waits for its match', () => {
    it('WHEN its match is interrupted THEN it stays failed', () => {
      store.processEnded(RUN, 1, 4000);

      store.setMatch(RUN, 1000, INTERRUPTED);

      expect(store.get('/ws', 'build')).toMatchObject({ state: 'failed', match: INTERRUPTED });
    });
  });
});
