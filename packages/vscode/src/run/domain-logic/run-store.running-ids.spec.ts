import { beforeEach, describe, expect, it } from 'vitest';

import { RunStore } from './run-store.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { RunDefinition, RunRequest } from '../common/run.type.ts';
import { RUN_REQUEST_STUB } from '../test/stubs/run.stub.ts';

const requestOf = (root: string, id: string): RunRequest => {
  const task = { ...TASK_NODE_STUB, id };
  const request: RunRequest = { ...RUN_REQUEST_STUB, root, task };

  return request;
};

const definitionOf = (root: string, id: string): RunDefinition => {
  const definition: RunDefinition = { root, id };

  return definition;
};

describe('FEATURE: run store running ids', () => {
  let store: RunStore;

  beforeEach(() => {
    store = new RunStore();
  });

  describe('GIVEN no run', () => {
    it('WHEN the ids of a root are asked THEN the set is empty', () => {
      expect(store.runningIds('/ws').size).toBe(0);
    });
  });

  describe('GIVEN runs of two roots', () => {
    beforeEach(() => {
      store.tryStart(requestOf('/ws', 'a#lint'), 1000);
      store.tryStart(requestOf('/ws', 'b#lint'), 1000);
      store.tryStart(requestOf('/other', 'c#lint'), 1000);
    });

    it('WHEN the ids of /ws are asked THEN they are exactly the running ids of /ws', () => {
      expect(store.runningIds('/ws')).toStrictEqual(new Set(['a#lint', 'b#lint']));
    });

    it('WHEN the ids of /other are asked THEN another root runs never show', () => {
      expect(store.runningIds('/other')).toStrictEqual(new Set(['c#lint']));
    });

    it('WHEN a run ends THEN its id leaves the set', () => {
      store.processEnded(definitionOf('/ws', 'a#lint'), 0, 2000);

      expect(store.runningIds('/ws')).toStrictEqual(new Set(['b#lint']));
    });

    it('WHEN an ended run is pruned THEN the running ids stay', () => {
      store.processEnded(definitionOf('/ws', 'a#lint'), 0, 2000);
      store.prune('/ws', new Set());

      expect(store.runningIds('/ws')).toStrictEqual(new Set(['b#lint']));
    });

    it('WHEN the ids are asked twice THEN each answer is its own set', () => {
      const first = store.runningIds('/ws');

      expect(store.runningIds('/ws')).not.toBe(first);
    });

    it('WHEN an ended task starts again THEN its id is back', () => {
      store.processEnded(definitionOf('/ws', 'a#lint'), 0, 2000);
      store.tryStart(requestOf('/ws', 'a#lint'), 3000);

      expect(store.runningIds('/ws')).toStrictEqual(new Set(['a#lint', 'b#lint']));
    });
  });
});
