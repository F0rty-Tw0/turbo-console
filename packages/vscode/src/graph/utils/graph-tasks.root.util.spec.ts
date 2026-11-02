import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOf } from './graph-state.util.ts';
import { graphTasksOf } from './graph-tasks.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { ATOM_UMBRELLA_TASK_STUB, GRAPH_ATOM_MODEL_STUB } from '../test/stubs/graph-atom-model.stub.ts';
import { GRAPH_SHOWN_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';

const GEN: TaskNode = { ...TASK_NODE_STUB, id: '//#gen', name: 'gen', isTurboTask: true };
const LINT: TaskNode = { ...TASK_NODE_STUB, id: '//#lint', name: 'lint', command: 'eslint .' };
const BUILD: TaskNode = { ...TASK_NODE_STUB, id: 'a#build', name: 'build' };
const DEPLOY: TaskNode = { ...TASK_NODE_STUB, id: 'a#deploy', name: 'deploy', dependencies: ['//#gen'] };
const ROOT: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', tasks: [GEN] };
const A: PackageNode = { ...PACKAGE_NODE_STUB, name: 'a', path: 'packages/a', tasks: [BUILD, DEPLOY] };

const modelOf = (root: PackageNode | null, ...packages: PackageNode[]): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages, rootPackage: root };

  return model;
};

const graphPartsOf = (model: WorkspaceModel): unknown[] => {
  const state: GraphState = graphStateOf(model, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

  if (state.kind !== 'graph') return [state.kind];

  return [state.packages, state.edges, state.hash];
};

describe('FEATURE: graph listing, root tasks', () => {
  describe('GIVEN a monorepo root task', () => {
    it('WHEN listed THEN it comes first by id', () => {
      const ids = graphTasksOf(modelOf(ROOT, A)).map(({ id }) => id);

      expect(ids).toStrictEqual(['//#gen', 'a#build', 'a#deploy']);
    });

    it('WHEN listed THEN it is a // turbo task that is not runnable', () => {
      const [first] = graphTasksOf(modelOf(ROOT, A));

      expect(first).toMatchObject({ packageName: '//', name: 'gen', isTurboTask: true, isRunnable: false });
    });

    it('WHEN a package task depends on it THEN the dependency is kept', () => {
      const deploy = graphTasksOf(modelOf(ROOT, A)).find(({ id }) => id === 'a#deploy');

      expect(deploy?.dependencies).toStrictEqual(['//#gen']);
    });

    it('WHEN the state is built THEN packages, edges and hash match the same model without it', () => {
      const withRoot = graphPartsOf(modelOf(ROOT, A));

      expect(withRoot).toStrictEqual(graphPartsOf(modelOf(null, A)));
    });

    it('WHEN the root is in the atom model THEN //#all-e2e is not runnable and still depends on the umbrella', () => {
      const task = graphTasksOf(GRAPH_ATOM_MODEL_STUB).find(({ id }) => id === '//#all-e2e');

      expect(task).toMatchObject({ isRunnable: false, dependencies: [ATOM_UMBRELLA_TASK_STUB.id] });
    });
  });

  describe('GIVEN no root package', () => {
    it('WHEN a package task depends on a root task THEN the dependency is dropped', () => {
      const deploy = graphTasksOf(modelOf(null, A)).find(({ id }) => id === 'a#deploy');

      expect(deploy?.dependencies).toStrictEqual([]);
    });
  });

  describe('GIVEN a single-package model with // in packages', () => {
    it('WHEN listed THEN its tasks stay runnable (L11-10)', () => {
      const single: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', tasks: [LINT] };
      const alone = modelOf(null, single);
      const model: WorkspaceModel = { ...alone, singlePackage: true };

      const [first] = graphTasksOf(model);

      expect(first).toMatchObject({ id: '//#lint', isRunnable: true });
    });
  });
});
