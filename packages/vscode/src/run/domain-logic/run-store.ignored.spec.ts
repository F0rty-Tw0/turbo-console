import { beforeEach, describe, expect, it } from 'vitest';

import { RunStore } from './run-store.ts';
import type { RunDefinition, RunEntry } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };
const UNKNOWN: RunDefinition = { root: '/ws', id: 'lint' };

const changesOf = (store: RunStore): RunEntry[] => {
  const changes: RunEntry[] = [];

  store.onDidChange((entry) => changes.push(entry));

  return changes;
};

describe('FEATURE: run store, events for a run that is not running are ignored', () => {
  let store: RunStore;

  beforeEach(() => {
    store = new RunStore();
    store.tryStart(RUN_REQUEST_STUB, 1000);
  });

  describe('GIVEN events for a task with no entry', () => {
    it('WHEN its process starts THEN nothing changes', () => {
      const changes = changesOf(store);

      store.processStarted(UNKNOWN, 1200);

      expect(changes).toStrictEqual([]);
    });

    it('WHEN its process ends THEN nothing is ended', () => {
      expect(store.processEnded(UNKNOWN, 0, 4000)).toBeNull();
    });

    it('WHEN it fails to start THEN nothing is ended', () => {
      expect(store.failStart(UNKNOWN, 1500)).toBeNull();
    });

    it('WHEN Stop is pressed THEN nothing changes', () => {
      const changes = changesOf(store);

      store.requestStop(UNKNOWN);

      expect(changes).toStrictEqual([]);
    });
  });

  describe('GIVEN a run that ended', () => {
    beforeEach(() => {
      store.processEnded(RUN, 0, 4000);
    });

    it('WHEN its process end is reported again THEN it is ignored', () => {
      expect(store.processEnded(RUN, 1, 5000)).toBeNull();
    });

    it('WHEN its task ends THEN it keeps its end state', () => {
      store.failStart(RUN, 5000);

      expect(store.get('/ws', 'build')?.state).toBe('passed');
    });

    it('WHEN its process start is reported late THEN nothing changes', () => {
      const changes = changesOf(store);

      store.processStarted(RUN, 4500);

      expect(changes).toStrictEqual([]);
    });

    it('WHEN its process start is reported late THEN no start time is recorded', () => {
      store.processStarted(RUN, 4500);

      expect(store.get('/ws', 'build')?.processStartedAt).toBeNull();
    });

    it('WHEN Stop is pressed THEN nothing changes', () => {
      const changes = changesOf(store);

      store.requestStop(RUN);

      expect(changes).toStrictEqual([]);
    });

    it('WHEN Stop is pressed THEN it is not marked stopped by the user', () => {
      store.requestStop(RUN);

      expect(store.get('/ws', 'build')?.stopRequested).toBe(false);
    });
  });
});
