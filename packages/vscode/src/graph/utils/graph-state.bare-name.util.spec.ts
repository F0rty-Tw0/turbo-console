import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOf } from './graph-state.util.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import { modelViewOf } from '../../tree/utils/model-view.util.ts';
import { GRAPH_HASH_STUB, GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';

const ROOT_TASK: TaskNode = { ...TASK_NODE_STUB, id: '//#build', name: 'build' };
const ROOT_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: '//', path: '', label: 'single-app', tasks: [ROOT_TASK] };
const SINGLE_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB, singlePackage: true, packages: [ROOT_NODE] };
const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'dev', name: 'dev', isTurboTask: false };

const packageNamed = (name: string, tasks: TaskNode[]): PackageNode => {
  const node: PackageNode = { ...PACKAGE_NODE_STUB, name, path: `packages/${name}`, tasks };

  return node;
};

const bareNamesOf = (state: GraphState): string[] => {
  if (state.kind !== 'graph') return [];

  return state.packages.map((pkg) => pkg.bareName);
};

describe('FEATURE: graph package bareName', () => {
  it('GIVEN scoped and unscoped packages WHEN the state is built THEN a scope is stripped and the rest keep their name', () => {
    const state = graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB);

    expect(bareNamesOf(state)).toStrictEqual(['x', 'a', 'web']);
  });

  it('GIVEN a single-package root labelled single-app WHEN built THEN bareName is the label', () => {
    const state = graphStateOf(SINGLE_MODEL, NO_LAYOUT_CACHES_STUB);

    expect(bareNamesOf(state)).toStrictEqual(['single-app']);
  });

  it('GIVEN @a/ui is script-only and @b/ui is a turbo package WHEN built THEN both keep their full name, though the tree with scripts hidden reads ui', () => {
    const scriptOnly = packageNamed('@a/ui', [SCRIPT_TASK]);
    const turbo = packageNamed('@b/ui', [TASK_NODE_STUB]);
    const model: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [scriptOnly, turbo] };

    const state = graphStateOf(model, NO_LAYOUT_CACHES_STUB);

    expect(bareNamesOf(state)).toStrictEqual(['@a/ui', '@b/ui']);
    expect(modelViewOf(model, false, new Set()).bareTexts.get('@b/ui')).toBe('ui');
  });

  it('WHEN the model is built with the same packages THEN the hash does not mention bareName', () => {
    const state = graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB);

    expect(state).toMatchObject({ hash: GRAPH_HASH_STUB });
  });
});
