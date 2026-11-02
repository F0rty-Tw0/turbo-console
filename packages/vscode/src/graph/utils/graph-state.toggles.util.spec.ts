import type { PackageNode, TaskNode, WorkspaceModel } from '@turbo-console/core';
import type { GraphState } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOf, graphStateOfRoot, shownOf } from './graph-state.util.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { GraphShown } from '../common/graph.type.ts';
import {
  GRAPH_MODEL_STUB,
  GRAPH_SHOWN_STUB,
  NO_LAYOUT_CACHES_STUB,
  SCRIPT_ONLY_MODEL_STUB,
  SCRIPT_PACKAGE_STUB,
  SCRIPT_TASK_STUB
} from '../test/stubs/graph-model.stub.ts';
import { togglesOf } from '../test/utils/graph-feeds.spec.util.ts';

const MIXED_NODE: PackageNode = { ...SCRIPT_PACKAGE_STUB, tasks: [TASK_NODE_STUB, SCRIPT_TASK_STUB] };
const MIXED_MODEL: WorkspaceModel = { ...SCRIPT_ONLY_MODEL_STUB, packages: [MIXED_NODE] };
const FILE_TASK: TaskNode = { ...TASK_NODE_STUB, id: 'build:f', name: 'build:f', kind: 'atom-file' };
const FILE_NODE: PackageNode = { ...SCRIPT_PACKAGE_STUB, tasks: [TASK_NODE_STUB, FILE_TASK] };
const FILE_MODEL: WorkspaceModel = { ...SCRIPT_ONLY_MODEL_STUB, packages: [FILE_NODE] };
const BOTH: GraphShown = { scopeShown: true, scriptsShown: true };
const SCRIPTS_SHOWN: GraphShown = { scopeShown: false, scriptsShown: true };

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

  describe('GIVEN a script-only package', () => {
    it('WHEN scripts are hidden THEN taskCount is 0', () => {
      const state = graphStateOf(SCRIPT_ONLY_MODEL_STUB, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(taskCountsOf(state)).toStrictEqual([0]);
    });

    it('WHEN scripts are shown THEN taskCount is 1', () => {
      const state = graphStateOf(SCRIPT_ONLY_MODEL_STUB, NO_LAYOUT_CACHES_STUB, SCRIPTS_SHOWN);

      expect(taskCountsOf(state)).toStrictEqual([1]);
    });
  });

  describe('GIVEN a turbo task and a script', () => {
    it('WHEN scripts are hidden THEN taskCount is 1', () => {
      const state = graphStateOf(MIXED_MODEL, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(taskCountsOf(state)).toStrictEqual([1]);
    });

    it('WHEN scripts are shown THEN taskCount is 2', () => {
      const state = graphStateOf(MIXED_MODEL, NO_LAYOUT_CACHES_STUB, SCRIPTS_SHOWN);

      expect(taskCountsOf(state)).toStrictEqual([2]);
    });
  });

  describe('GIVEN a turbo task and an atom-file task', () => {
    it('WHEN scripts are hidden THEN the file is not counted', () => {
      const state = graphStateOf(FILE_MODEL, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);

      expect(taskCountsOf(state)).toStrictEqual([1]);
    });

    it('WHEN scripts are shown THEN the file is not counted', () => {
      const state = graphStateOf(FILE_MODEL, NO_LAYOUT_CACHES_STUB, SCRIPTS_SHOWN);

      expect(taskCountsOf(state)).toStrictEqual([1]);
    });
  });

  describe('GIVEN scope shown and scripts hidden toggles', () => {
    it('WHEN shownOf reads them THEN it returns exactly that', () => {
      const toggles = togglesOf(true);

      expect(shownOf(toggles)).toStrictEqual({ scopeShown: true, scriptsShown: false });
    });
  });
});
