import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { persistentIdsOfRoot } from './graph-state.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { GRAPH_MODEL_STUB } from '../test/stubs/graph-model.stub.ts';

const ROOT_TASK: TaskNode = { ...TASK_NODE_STUB, id: '//#build', name: 'build' };
const ROOT_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', label: 'single-app', tasks: [ROOT_TASK] };
const DEV_TASK: TaskNode = { ...TASK_NODE_STUB, id: '//#dev', name: 'dev', persistent: true };
const DEV_ROOT_NODE: PackageNode = { ...ROOT_NODE, tasks: [ROOT_TASK, DEV_TASK] };
const DEV_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true, packages: [DEV_ROOT_NODE] };

const stateOf = (fields: Partial<RootState>): RootState => {
  const state: RootState = { ...ROOT_STATE_STUB, ...fields };

  return state;
};

describe('FEATURE: persistent ids of a root', () => {
  describe('GIVEN a root that shows a model with a persistent task', () => {
    it('WHEN its persistent ids are taken THEN they are those of the model', () => {
      const ids = persistentIdsOfRoot(stateOf({ model: DEV_MODEL }));

      expect([...ids]).toStrictEqual(['//#dev']);
    });
  });

  describe.each([
    ['no state', undefined],
    ['no model', stateOf({ model: null })],
    ['a binary failure over a model', stateOf({ model: DEV_MODEL, error: LOAD_FAILURE_STUB })]
  ])('GIVEN %s', (_label, root) => {
    it('WHEN its persistent ids are taken THEN there are none', () => {
      const ids = persistentIdsOfRoot(root);

      expect(ids.size).toBe(0);
    });
  });
});
