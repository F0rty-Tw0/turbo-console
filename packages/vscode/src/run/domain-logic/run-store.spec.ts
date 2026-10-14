import type { RunMatch } from '@turbo-console/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RunStore } from './run-store.ts';
import type { RunDefinition, RunEntry, RunRequest, Terminable } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };
const UNKNOWN: RunDefinition = { root: '/ws', id: 'lint' };
const OTHER_ROOT: RunRequest = { ...RUN_REQUEST_STUB, root: '/other' };
const MATCH: RunMatch = { cache: 'HIT', durationMs: 3200 };

const entryOf = (store: RunStore, definition: RunDefinition): RunEntry => {
  const entry = store.get(definition.root, definition.id);

  if (entry === undefined) throw new Error(`no entry for ${definition.id}`);

  return entry;
};

const changesOf = (store: RunStore): RunEntry[] => {
  const changes: RunEntry[] = [];

  store.onDidChange((entry) => changes.push(entry));

  return changes;
};

const terminable = (): Terminable => {
  const execution: Terminable = { terminate: vi.fn() };

  return execution;
};

describe('FEATURE: run store', () => {
  let store: RunStore;

  beforeEach(() => {
    store = new RunStore();
  });

  describe('GIVEN no run of the task', () => {
    it('WHEN a run starts THEN it is accepted', () => {
      expect(store.tryStart(RUN_REQUEST_STUB, 1000)).toBe(true);
    });

    it('WHEN a run starts THEN its entry is running from that time on', () => {
      store.tryStart(RUN_REQUEST_STUB, 1000);

      expect(entryOf(store, RUN)).toMatchObject({ state: 'running', launchedAt: 1000, taskId: 'build', packageName: 'a' });
    });

    it('WHEN a run starts THEN the change is announced', () => {
      const changes = changesOf(store);

      store.tryStart(RUN_REQUEST_STUB, 1000);

      expect(changes.map((entry) => entry.state)).toStrictEqual(['running']);
    });

    it('WHEN the task is looked up THEN there is no entry', () => {
      expect(store.get('/ws', 'build')).toBeUndefined();
    });
  });

  describe('GIVEN a running entry', () => {
    let execution: Terminable;

    beforeEach(() => {
      store.tryStart(RUN_REQUEST_STUB, 1000);
      execution = terminable();
    });

    it('WHEN a second run of the task starts THEN it is refused', () => {
      expect(store.tryStart(RUN_REQUEST_STUB, 1100)).toBe(false);
    });

    it('WHEN the same task of another root starts THEN it is accepted', () => {
      expect(store.tryStart(OTHER_ROOT, 1100)).toBe(true);
    });

    it('WHEN Stop is pressed before the execution arrives THEN the execution is terminated on arrival', () => {
      store.requestStop(RUN);
      store.attach(RUN, execution);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN Stop is pressed after the execution arrived THEN the execution is terminated', () => {
      store.attach(RUN, execution);
      store.requestStop(RUN);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN the execution arrives with no Stop THEN it keeps running', () => {
      store.attach(RUN, execution);

      expect(execution.terminate).not.toHaveBeenCalled();
    });

    it('WHEN Stop is pressed THEN the entry is marked stopped by the user and still running', () => {
      store.requestStop(RUN);

      expect(entryOf(store, RUN)).toMatchObject({ state: 'running', stopRequested: true });
    });

    it('WHEN its process starts THEN the start time is recorded', () => {
      store.processStarted(RUN, 1200);

      expect(entryOf(store, RUN).processStartedAt).toBe(1200);
    });

    it.each<[number | undefined, Partial<RunEntry>]>([
      [0, { state: 'passed', exitCode: 0, endedAt: 4000, matching: true }],
      [1, { state: 'failed', exitCode: 1, endedAt: 4000, matching: true }],
      [undefined, { state: 'failed', exitCode: null, endedAt: 4000, matching: false }]
    ])('WHEN its process ends with exit code %s THEN the entry ends as %o', (exitCode, expected) => {
      const ended = store.processEnded(RUN, exitCode, 4000);

      expect(ended).toMatchObject(expected);
    });

    it('WHEN Stop was pressed and the process ends with exit code 1 THEN it is stopped and no match follows', () => {
      store.requestStop(RUN);

      const ended = store.processEnded(RUN, 1, 4000);

      expect(ended).toMatchObject({ state: 'stopped', exitCode: 1, matching: false });
    });

    it('WHEN it fails to start THEN the entry ends as failed to start', () => {
      const failed = store.failStart(RUN);

      expect(failed?.state).toBe('failed-to-start');
    });

    it('WHEN it fails to start after the execution arrived THEN the execution is terminated', () => {
      store.attach(RUN, execution);

      store.failStart(RUN);

      expect(execution.terminate).toHaveBeenCalledOnce();
    });

    it('WHEN a match is set before the process ended THEN it is ignored', () => {
      store.setMatch(RUN, MATCH);

      expect(entryOf(store, RUN).match).toBeNull();
    });

    it('WHEN the root is pruned without its task THEN the entry survives', () => {
      store.prune('/ws', new Set());

      expect(store.get('/ws', 'build')?.state).toBe('running');
    });
  });

  describe('GIVEN events for a task with no running entry', () => {
    beforeEach(() => {
      store.tryStart(RUN_REQUEST_STUB, 1000);
    });

    it('WHEN its process starts THEN nothing changes', () => {
      const changes = changesOf(store);

      store.processStarted(UNKNOWN, 1200);

      expect(changes).toStrictEqual([]);
    });

    it('WHEN its process ends THEN nothing is ended', () => {
      expect(store.processEnded(UNKNOWN, 0, 4000)).toBeNull();
    });

    it('WHEN it fails to start THEN nothing is ended', () => {
      expect(store.failStart(UNKNOWN)).toBeNull();
    });

    it('WHEN Stop is pressed THEN nothing changes', () => {
      const changes = changesOf(store);

      store.requestStop(UNKNOWN);

      expect(changes).toStrictEqual([]);
    });

    it('WHEN an ended run sees its process end again THEN it is ignored', () => {
      store.processEnded(RUN, 1, 4000);

      expect(store.processEnded(RUN, 0, 5000)).toBeNull();
    });

    it('WHEN an ended run sees its task end THEN it keeps its end state', () => {
      store.processEnded(RUN, 0, 4000);

      store.failStart(RUN);

      expect(entryOf(store, RUN).state).toBe('passed');
    });

    it('WHEN an ended run gets an execution THEN it is not terminated', () => {
      const execution = terminable();

      store.processEnded(RUN, 0, 4000);
      store.requestStop(RUN);
      store.attach(RUN, execution);

      expect(execution.terminate).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN an ended entry waiting for its match', () => {
    beforeEach(() => {
      store.tryStart(RUN_REQUEST_STUB, 1000);
      store.processEnded(RUN, 0, 4000);
    });

    it('WHEN the match is set THEN it is stored and matching ends', () => {
      store.setMatch(RUN, MATCH);

      expect(entryOf(store, RUN)).toMatchObject({ match: MATCH, matching: false });
    });

    it('WHEN no match is found THEN matching ends with no match', () => {
      store.setMatch(RUN, null);

      expect(entryOf(store, RUN)).toMatchObject({ match: null, matching: false });
    });

    it('WHEN the match is set THEN the change is announced', () => {
      const changes = changesOf(store);

      store.setMatch(RUN, MATCH);

      expect(changes.map((entry) => entry.match)).toStrictEqual([MATCH]);
    });

    it('WHEN a new run of the task starts THEN it is accepted', () => {
      expect(store.tryStart(RUN_REQUEST_STUB, 5000)).toBe(true);
    });

    it('WHEN a new run started before the match arrived THEN the new run gets no match', () => {
      store.tryStart(RUN_REQUEST_STUB, 5000);

      store.setMatch(RUN, MATCH);

      expect(entryOf(store, RUN)).toMatchObject({ state: 'running', match: null });
    });

    it('WHEN the root is pruned without its task THEN the entry is dropped', () => {
      store.prune('/ws', new Set());

      expect(store.get('/ws', 'build')).toBeUndefined();
    });

    it('WHEN the root is pruned with its task THEN the entry is kept', () => {
      store.prune('/ws', new Set(['build']));

      expect(store.get('/ws', 'build')?.state).toBe('passed');
    });

    it('WHEN another root is pruned THEN the entry is kept', () => {
      store.prune('/other', new Set());

      expect(store.get('/ws', 'build')?.state).toBe('passed');
    });
  });

  describe('GIVEN a listener that unsubscribed', () => {
    it('WHEN a run starts THEN it hears nothing', () => {
      const changes: RunEntry[] = [];
      const unsubscribe = store.onDidChange((entry) => changes.push(entry));

      unsubscribe();
      store.tryStart(RUN_REQUEST_STUB, 1000);

      expect(changes).toStrictEqual([]);
    });
  });
});
