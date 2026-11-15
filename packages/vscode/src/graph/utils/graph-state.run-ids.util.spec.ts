import { TurboException } from '@turbo-console/core';
import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { graphStateOfRoot, runIdsOfRoot } from './graph-state.util.ts';
import { runIdsOf } from './graph-tasks.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { LOAD_FAILURE_STUB } from '../../roots/test/stubs/root.stub.ts';
import { loadFailureOf } from '../../roots/test/utils/load-failure.spec.util.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { GRAPH_MODEL_STUB, GRAPH_SHOWN_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';

const ROOT_TASK: TaskNode = { ...TASK_NODE_STUB, id: '//#build', name: 'build' };
const ROOT_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', label: 'single-app', tasks: [ROOT_TASK] };
const SINGLE_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true, packages: [ROOT_NODE] };

const stateOf = (fields: Partial<RootState>): RootState => {
  const state: RootState = { ...ROOT_STATE_STUB, ...fields };

  return state;
};
const LOAD_FAILURE = loadFailureOf('load', new TurboException('failed', 'bad json'));

describe('FEATURE: run ids of a root', () => {
  describe.each([
    ['a graph', stateOf({ model: GRAPH_MODEL_STUB })],
    ['a single-package model', stateOf({ model: SINGLE_MODEL })],
    ['a binary failure over a model', stateOf({ model: GRAPH_MODEL_STUB, error: LOAD_FAILURE_STUB })],
    ['a load failure with no model', stateOf({ model: null, error: LOAD_FAILURE })],
    ['no model and no error', stateOf({ model: null })],
    ['no state', undefined]
  ])('GIVEN %s', (_label, root) => {
    it('WHEN the run ids are read THEN they are those of the state', () => {
      const state = graphStateOfRoot(root, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(runIdsOfRoot(root)).toStrictEqual(runIdsOf(state));
    });
  });

  describe('GIVEN a graph', () => {
    it('WHEN the run ids are read THEN they are listed', () => {
      expect(runIdsOfRoot(stateOf({ model: GRAPH_MODEL_STUB }))).not.toStrictEqual([]);
    });
  });

  describe('GIVEN a single-package model', () => {
    it('WHEN the run ids are read THEN they list the // tasks', () => {
      expect(runIdsOfRoot(stateOf({ model: SINGLE_MODEL }))).not.toStrictEqual([]);
    });
  });
});
