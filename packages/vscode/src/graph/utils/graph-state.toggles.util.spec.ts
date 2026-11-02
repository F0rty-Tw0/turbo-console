import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOf, graphStateOfRoot, shownOf } from './graph-state.util.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { PACKAGE_NODE_STUB, TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { GraphShown } from '../common/graph.type.ts';
import { GRAPH_MODEL_STUB, GRAPH_SHOWN_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';
import { scopeShownTogglesOf } from '../test/utils/graph-feeds.spec.util.ts';

const SCRIPT_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'dev', name: 'dev', isTurboTask: false };
const SCRIPT_NODE: PackageNode = { ...PACKAGE_NODE_STUB, name: 'tool', path: 'packages/tool', tasks: [SCRIPT_TASK] };
const SCRIPT_MODEL: WorkspaceModel = { ...GRAPH_MODEL_STUB, packages: [SCRIPT_NODE], edges: [] };
const BOTH: GraphShown = { scopeShown: true, scriptsShown: true };

const taskCountsOf = (state: GraphState): number[] => {
  if (state.kind !== 'graph') return [];

  return state.packages.map((node) => node.taskCount);
};

describe('FEATURE: graph state toggles', () => {
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true]
  ])('GIVEN scopeShown %s and scriptsShown %s WHEN the state is built THEN it carries both as given', (scopeShown, scriptsShown) => {
    const state = graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB, { scopeShown, scriptsShown });

    expect(state).toMatchObject({ kind: 'graph', scopeShown, scriptsShown });
  });

  it('GIVEN a loaded root WHEN built through graphStateOfRoot THEN the toggles pass through', () => {
    const root = { ...ROOT_STATE_STUB, model: GRAPH_MODEL_STUB };
    const shown: GraphShown = { scopeShown: true, scriptsShown: false };

    const state = graphStateOfRoot(root, NO_LAYOUT_CACHES_STUB, shown);

    expect(state).toMatchObject({ kind: 'graph', scopeShown: true, scriptsShown: false });
  });

  it('GIVEN toggles of every value WHEN built THEN hash, positions and tasks are the same', () => {
    const hidden = graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);
    const shown = graphStateOf(GRAPH_MODEL_STUB, NO_LAYOUT_CACHES_STUB, BOTH);

    expect({ ...shown, ...GRAPH_SHOWN_STUB }).toStrictEqual(hidden);
  });

  it('GIVEN scriptsShown false and a script-only package WHEN built THEN taskCount still counts the script', () => {
    const state = graphStateOf(SCRIPT_MODEL, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

    expect(taskCountsOf(state)).toStrictEqual([1]);
  });

  it('GIVEN scope shown and scripts hidden WHEN shownOf reads the toggles THEN it returns exactly that', () => {
    const toggles = scopeShownTogglesOf();

    expect(shownOf(toggles)).toStrictEqual({ scopeShown: true, scriptsShown: false });
  });
});
