import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOf } from './graph-state.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { modelViewOf } from '../../tree/utils/model-view.util.ts';
import type { GraphShown } from '../common/graph.type.ts';
import { GRAPH_HASH_STUB, GRAPH_MODEL_STUB, GRAPH_SHOWN_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';

const ROOT_TASK: TaskNode = { ...TASK_NODE_STUB, id: '//#build', name: 'build' };
const ROOT_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', label: 'single-app', tasks: [ROOT_TASK] };
const SINGLE_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true, packages: [ROOT_NODE] };
const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'dev', name: 'dev', isTurboTask: false };

const packageNamed = (name: string, tasks: TaskNode[]): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, path: `packages/${name}`, tasks };

  return node;
};

const SAME_BARE_MODEL: WorkspaceModel = {
  ...GRAPH_MODEL_STUB,
  packages: [packageNamed('@a/ui', [SCRIPT_TASK]), packageNamed('@b/ui', [TASK_NODE_STUB])]
};

const SCOPED_ROOT_NODE: PackageNode = { ...ROOT_NODE, label: '@acme/monorepo' };

const SCOPED_ROOT_MODEL: WorkspaceModel = {
  ...GRAPH_MODEL_STUB,
  packages: [SCOPED_ROOT_NODE, packageNamed('@acme/web', [TASK_NODE_STUB])]
};

const SCOPES_SHOWN: GraphShown = { ...GRAPH_SHOWN_STUB, scopeShown: true };

const bareNamesOf = (state: GraphState): string[] => {
  if (state.kind !== 'graph') return [];

  return state.packages.map((pkg) => pkg.bareName);
};

describe('FEATURE: graph package bareName', () => {
  describe('GIVEN scoped and unscoped packages', () => {
    it('WHEN the state is built THEN a scope is stripped and the rest keep their name', () => {
      const state = graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(bareNamesOf(state)).toStrictEqual(['x', 'a', 'web']);
    });
  });

  describe('GIVEN a single-package root labelled single-app', () => {
    it('WHEN built THEN bareName is the label', () => {
      const state = graphStateOf(SINGLE_MODEL, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(bareNamesOf(state)).toStrictEqual(['single-app']);
    });
  });

  describe('GIVEN a monorepo root labelled @acme/monorepo beside @acme/web', () => {
    it('WHEN built with scopes shown THEN the root reads @acme/monorepo, as its tree row does', () => {
      const state = graphStateOf(SCOPED_ROOT_MODEL, NO_LAYOUT_CACHES_STUB, SCOPES_SHOWN);

      expect(bareNamesOf(state)).toStrictEqual(['@acme/monorepo', 'web']);
    });

    it('WHEN built with scopes hidden THEN the root reads (root) monorepo', () => {
      const state = graphStateOf(SCOPED_ROOT_MODEL, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(bareNamesOf(state)).toStrictEqual(['(root) monorepo', 'web']);
    });
  });

  describe('GIVEN a root labelled savings beside @x/savings', () => {
    const rootNode: PackageNode = { ...ROOT_NODE, label: 'savings' };
    const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [rootNode, packageNamed('@x/savings', [TASK_NODE_STUB])] };

    it('WHEN built with scopes hidden THEN the root reads (root) savings and the app reads savings', () => {
      const state = graphStateOf(model, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(bareNamesOf(state)).toStrictEqual(['(root) savings', 'savings']);
    });

    it('WHEN built with scopes shown THEN the root reads savings, no prefix, and the app keeps its bare name', () => {
      const state = graphStateOf(model, NO_LAYOUT_CACHES_STUB, SCOPES_SHOWN);

      expect(bareNamesOf(state)).toStrictEqual(['savings', 'savings']);
    });
  });

  describe('GIVEN a single-package root', () => {
    it.each([true, false])('WHEN built with scopeShown %s THEN it reads its label, no prefix', (scopeShown) => {
      const state = graphStateOf(SINGLE_MODEL, NO_LAYOUT_CACHES_STUB, { ...GRAPH_SHOWN_STUB, scopeShown });

      expect(bareNamesOf(state)).toStrictEqual(['single-app']);
    });
  });

  describe('GIVEN @a/ui is script-only and @b/ui is a turbo package', () => {
    it('WHEN built THEN both keep their full name', () => {
      const state = graphStateOf(SAME_BARE_MODEL, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(bareNamesOf(state)).toStrictEqual(['@a/ui', '@b/ui']);
    });

    it('WHEN the tree is built with scripts hidden THEN @b/ui reads ui', () => {
      expect(modelViewOf(SAME_BARE_MODEL, false, new Set()).bareTexts.get('@b/ui')).toBe('ui');
    });
  });

  it('WHEN the model is built with the same packages THEN the hash does not mention bareName', () => {
    const state = graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

    expect(state).toMatchObject({ hash: GRAPH_HASH_STUB });
  });
});
