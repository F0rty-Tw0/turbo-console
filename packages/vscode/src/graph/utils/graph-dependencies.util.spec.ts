import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { dependenciesOfModel, runDependenciesOf } from './graph-dependencies.util.ts';
import type { RootEntry, RootState, Roots } from '../../roots/common/coordinator.type.ts';
import { coordinatorMock } from '../../roots/test/mocks/coordinator.mock.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB, WORKSPACE_MODEL_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { GRAPH_ATOM_MODEL_STUB } from '../test/stubs/graph-atom-model.stub.ts';

const taskOf = (id: string, dependencies: string[]): TaskNode => {
  const task: TaskNode = { ...TASK_NODE_STUB, id, dependencies };

  return task;
};

const packageOf = (name: string, tasks: TaskNode[]): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, path: `packages/${name}`, tasks };

  return node;
};

const WEB_PACKAGE = packageOf('web', [taskOf('web#build', ['ui#build', 'gone#build'])]);
const UI_PACKAGE = packageOf('ui', [taskOf('ui#build', [])]);
const ROOT_PACKAGE = packageOf('//', [taskOf('//#lint', ['web#build'])]);
const MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, packages: [ROOT_PACKAGE, WEB_PACKAGE, UI_PACKAGE] };

const SINGLE_PACKAGE = packageOf('//', [taskOf('//#build', ['//#codegen']), taskOf('//#codegen', [])]);
const SINGLE_MODEL: WorkspaceModel = { ...WORKSPACE_MODEL_STUB, singlePackage: true, packages: [SINGLE_PACKAGE] };

describe('FEATURE: the dependency snapshot of a run (spec D3, D10)', () => {
  let model: WorkspaceModel | null;
  let roots: Roots;

  beforeEach(() => {
    model = MODEL;

    const get = (root: string): RootEntry | undefined => {
      if (root !== '/ws') return undefined;

      const state: RootState = { ...ROOT_STATE_STUB, model };
      const entry: RootEntry = { state, coordinator: coordinatorMock() };

      return entry;
    };

    const onDidChange: Roots['onDidChange'] = () => (): void => undefined;

    roots = { get, all: (): RootEntry[] => [], onDidChange };
  });

  describe('GIVEN a root whose model has web#build → ui#build and a root task //#lint', () => {
    it('WHEN the snapshot is taken THEN web#build gives [ui#build]', () => {
      const dependenciesOf = runDependenciesOf(roots)('/ws');

      expect(dependenciesOf('web#build')).toStrictEqual(['ui#build']);
    });

    it('WHEN the snapshot is taken THEN the root task //#lint gives [web#build]', () => {
      const dependenciesOf = runDependenciesOf(roots)('/ws');

      expect(dependenciesOf('//#lint')).toStrictEqual(['web#build']);
    });

    it('WHEN asked for an id the listing lacks THEN []', () => {
      const dependenciesOf = runDependenciesOf(roots)('/ws');

      expect(dependenciesOf('gone#build')).toStrictEqual([]);
    });

    it('WHEN a caller edits the answer for an unknown id THEN the next unknown id still gives []', () => {
      const dependenciesOf = runDependenciesOf(roots)('/ws');

      dependenciesOf('gone#build').push('x#build');

      expect(dependenciesOf('other#build')).toStrictEqual([]);
    });

    it('WHEN the model changes after the snapshot THEN the snapshot still gives the old edges', () => {
      const dependenciesOf = runDependenciesOf(roots)('/ws');

      model = { ...MODEL, packages: [] };

      expect(dependenciesOf('web#build')).toStrictEqual(['ui#build']);
    });
  });

  describe('GIVEN an Atomizer group', () => {
    it('WHEN the snapshot is taken THEN the umbrella holds the folded dependencies', () => {
      const dependenciesOf = dependenciesOfModel(GRAPH_ATOM_MODEL_STUB);

      expect(dependenciesOf('@fx/e2e#e2e-ci')).toStrictEqual(['@fx/app#build']);
    });

    it('WHEN the snapshot is taken THEN the hidden aggregate gives []', () => {
      const dependenciesOf = dependenciesOfModel(GRAPH_ATOM_MODEL_STUB);

      expect(dependenciesOf('@fx/e2e#e2e-ci--all')).toStrictEqual([]);
    });
  });

  describe('GIVEN a single-package root', () => {
    it('WHEN the snapshot is taken THEN //#build gives its //# dependency', () => {
      const dependenciesOf = dependenciesOfModel(SINGLE_MODEL);

      expect(dependenciesOf('//#build')).toStrictEqual(['//#codegen']);
    });
  });

  describe.each([
    ['a root with no model', '/ws', null],
    ['an unknown root', '/other', MODEL]
  ])('GIVEN %s', (_title, root, loaded) => {
    it('WHEN the snapshot is taken THEN every id gives []', () => {
      model = loaded;

      const dependenciesOf = runDependenciesOf(roots)(root);

      expect(dependenciesOf('web#build')).toStrictEqual([]);
    });

    it('WHEN a caller edits the answer THEN the next answer is still []', () => {
      model = loaded;

      const dependenciesOf = runDependenciesOf(roots)(root);

      dependenciesOf('web#build').push('x#build');

      expect(dependenciesOf('web#build')).toStrictEqual([]);
    });
  });
});
