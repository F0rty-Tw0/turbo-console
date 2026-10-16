import type { TaskNode } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { RunStore } from './run-store.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { RunDefinition, RunRequest } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

const RUN: RunDefinition = { root: '/ws', id: 'build' };

const CONTINUOUS: TaskNode = { ...TASK_NODE_STUB, persistent: true };

const CONTINUOUS_REQUEST: RunRequest = { ...RUN_REQUEST_STUB, task: CONTINUOUS };

describe('FEATURE: run store, the end of a continuous task', () => {
  let store: RunStore;

  beforeEach(() => {
    store = new RunStore();
    store.tryStart(CONTINUOUS_REQUEST, 1000);
  });

  describe('GIVEN a running continuous task and no Stop', () => {
    it('WHEN its process ends with exit code 0 (Ctrl+C in its terminal) THEN it is stopped and no match follows', () => {
      const ended = store.processEnded(RUN, 0, 4000);

      expect(ended).toMatchObject({ state: 'stopped', exitCode: 0, endedAt: 4000, matching: false });
    });

    it('WHEN its process ends with exit code 1 THEN it failed and a match follows', () => {
      const ended = store.processEnded(RUN, 1, 4000);

      expect(ended).toMatchObject({ state: 'failed', exitCode: 1, matching: true });
    });
  });
});
