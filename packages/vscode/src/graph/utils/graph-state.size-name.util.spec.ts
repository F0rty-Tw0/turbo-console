import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphPackage, GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOf } from './graph-state.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { GraphShown } from '../common/graph.type.ts';
import { GRAPH_MODEL_STUB, GRAPH_SHOWN_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';

const ROOT_TASK: TaskNode = { ...TASK_NODE_STUB, id: '//#build', name: 'build' };
const ROOT_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', label: '@acme/monorepo', tasks: [ROOT_TASK] };
const WEB_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: 'web', path: 'apps/web' };

const SCOPES_SHOWN: GraphShown = { ...GRAPH_SHOWN_STUB, scopeShown: true };

const modelOf = (packages: PackageNode[], singlePackage = false): WorkspaceModel => {
  const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage, packages };

  return model;
};

const packagesOf = (state: GraphState): GraphPackage[] => {
  if (state.kind !== 'graph') return [];

  return state.packages;
};

const sizeNamesOf = (model: WorkspaceModel, shown: GraphShown): Array<string | undefined> => {
  const state: GraphState = graphStateOf(model, NO_LAYOUT_CACHES_STUB, shown);

  return packagesOf(state).map((pkg) => pkg.sizeName);
};

describe('FEATURE: graph package sizeName', () => {
  describe('GIVEN a root labelled @acme/monorepo beside web', () => {
    it.each([
      ['hidden', GRAPH_SHOWN_STUB],
      ['shown', SCOPES_SHOWN]
    ])('WHEN scopes are %s THEN only the root carries (root) @acme/monorepo', (_mode, shown) => {
      const sizeNames = sizeNamesOf(modelOf([ROOT_NODE, WEB_NODE]), shown);

      expect(sizeNames).toStrictEqual(['(root) @acme/monorepo', undefined]);
    });

    it('WHEN built THEN web has no sizeName key at all', () => {
      const state = graphStateOf(modelOf([ROOT_NODE, WEB_NODE]), NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);
      const web = packagesOf(state).find((pkg) => pkg.name === 'web');

      expect(web).toBeDefined();
      expect(web).not.toHaveProperty('sizeName');
    });
  });

  it('GIVEN a root labelled root beside web WHEN built THEN the root sizes for (root) root', () => {
    const labelled: PackageNode = { ...ROOT_NODE, label: 'root' };

    expect(sizeNamesOf(modelOf([labelled, WEB_NODE]), GRAPH_SHOWN_STUB)).toStrictEqual(['(root) root', undefined]);
  });

  it('GIVEN a root-only single-package model WHEN built THEN no package carries a sizeName', () => {
    expect(sizeNamesOf(modelOf([ROOT_NODE], true), GRAPH_SHOWN_STUB)).toStrictEqual([undefined]);
  });

  it('GIVEN a root with no label beside web WHEN built THEN no package carries a sizeName', () => {
    const unlabelled: PackageNode = { ...ROOT_NODE, label: null };

    expect(sizeNamesOf(modelOf([unlabelled, WEB_NODE]), GRAPH_SHOWN_STUB)).toStrictEqual([undefined, undefined]);
  });
});
