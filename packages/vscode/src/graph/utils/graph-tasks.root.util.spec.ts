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

const modelOf = (...packages: PackageNode[]): WorkspaceModel => {
  const model: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages };

  return model;
};

const graphPackageNamesOf = (model: WorkspaceModel): string[] => {
  const state: GraphState = graphStateOf(model, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

  if (state.kind !== 'graph') return [state.kind];

  return state.packages.map((pkg) => pkg.name);
};

describe('FEATURE: graph listing, root tasks', () => {
  describe('GIVEN a monorepo root task', () => {
    it('WHEN listed THEN it comes first by id', () => {
      const ids = graphTasksOf(modelOf(ROOT, A)).map(({ id }) => id);

      expect(ids).toStrictEqual(['//#gen', 'a#build', 'a#deploy']);
    });

    it('WHEN listed THEN it is a runnable // turbo task, as any package task', () => {
      const [first] = graphTasksOf(modelOf(ROOT, A));

      expect(first).toMatchObject({ packageName: '//', name: 'gen', isTurboTask: true, isRunnable: true });
    });

    it('WHEN a package task depends on it THEN the dependency is kept', () => {
      const deploy = graphTasksOf(modelOf(ROOT, A)).find(({ id }) => id === 'a#deploy');

      expect(deploy?.dependencies).toStrictEqual(['//#gen']);
    });

    it('WHEN the state is built THEN // is a graph package beside the others', () => {
      expect(graphPackageNamesOf(modelOf(ROOT, A))).toStrictEqual(['//', 'a']);
    });

    it('WHEN the root is in the atom model THEN //#all-e2e is runnable and still depends on the umbrella', () => {
      const task = graphTasksOf(GRAPH_ATOM_MODEL_STUB).find(({ id }) => id === '//#all-e2e');

      expect(task).toMatchObject({ isRunnable: true, dependencies: [ATOM_UMBRELLA_TASK_STUB.id] });
    });
  });

  describe('GIVEN no root package', () => {
    it('WHEN a package task depends on a root task THEN the dependency is dropped', () => {
      const deploy = graphTasksOf(modelOf(A)).find(({ id }) => id === 'a#deploy');

      expect(deploy?.dependencies).toStrictEqual([]);
    });
  });

  describe('GIVEN a single-package model with // in packages', () => {
    it('WHEN listed THEN its tasks stay runnable (L11-10)', () => {
      const single: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', tasks: [LINT] };
      const alone = modelOf(single);
      const model: WorkspaceModel = { ...alone, singlePackage: true };

      const [first] = graphTasksOf(model);

      expect(first).toMatchObject({ id: '//#lint', isRunnable: true });
    });
  });
});
