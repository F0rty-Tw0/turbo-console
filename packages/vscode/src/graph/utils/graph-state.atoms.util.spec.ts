import type { GraphAtomFile, GraphAtomGroup, GraphPackage, GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOf, runIdsOfRoot } from './graph-state.util.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import {
  ATOM_FILE_A_TASK_STUB,
  ATOM_FILE_B_TASK_STUB,
  ATOM_UMBRELLA_TASK_STUB,
  GRAPH_ATOM_MODEL_STUB
} from '../test/stubs/graph-atom-model.stub.ts';
import { NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';

const TASK_IDS = ['//#all-e2e', '@fx/app#build', ATOM_UMBRELLA_TASK_STUB.id];

const packagesOf = (state: GraphState): GraphPackage[] => {
  if (state.kind !== 'graph') return [];

  return state.packages;
};

const atomGroupsOf = (state: GraphState): GraphAtomGroup[] => {
  if (state.kind !== 'graph') return [];

  return state.atomGroups;
};

describe('FEATURE: graph state of a model with an Atomizer group', () => {
  const state = graphStateOf(GRAPH_ATOM_MODEL_STUB, NO_LAYOUT_CACHES_STUB);

  it('WHEN the state is built THEN atomGroups holds the group with its files in spec path order', () => {
    const fileA: GraphAtomFile = { id: ATOM_FILE_A_TASK_STUB.id, specPath: 'tests/a.spec.ts', isLive: false };
    const fileB: GraphAtomFile = { id: ATOM_FILE_B_TASK_STUB.id, specPath: 'tests/b fails.spec.ts', isLive: true };
    const files = [fileA, fileB];
    const group: GraphAtomGroup = { umbrellaId: ATOM_UMBRELLA_TASK_STUB.id, files };

    expect(atomGroupsOf(state)).toStrictEqual([group]);
  });

  it('WHEN the state is built THEN the package taskCount still counts the aggregate', () => {
    const packages = packagesOf(state);

    expect(packages.find((pkg) => pkg.name === '@fx/e2e')?.taskCount).toBe(2);
  });

  it('WHEN the run ids of the root are read THEN they are the task ids then the file ids', () => {
    const root = { ...ROOT_STATE_STUB, model: GRAPH_ATOM_MODEL_STUB };

    expect(runIdsOfRoot(root)).toStrictEqual([...TASK_IDS, ATOM_FILE_A_TASK_STUB.id, ATOM_FILE_B_TASK_STUB.id]);
  });
});
