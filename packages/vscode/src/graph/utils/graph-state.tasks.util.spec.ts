import type { GraphTask } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphStateOfRoot, tasksOfRoot } from './graph-state.util.ts';
import type { RootState } from '../../roots/common/coordinator.type.ts';
import { ROOT_STATE_STUB } from '../../tree/test/stubs/root-state.stub.ts';
import { GRAPH_MODEL_STUB, GRAPH_SHOWN_STUB, NO_LAYOUT_CACHES_STUB } from '../test/stubs/graph-model.stub.ts';

const NO_TASKS: GraphTask[] = [];

const stateOf = (fields: Partial<RootState>): RootState => {
  const state: RootState = { ...ROOT_STATE_STUB, ...fields };

  return state;
};

describe('FEATURE: tasks of a root', () => {
  it('GIVEN a loaded root WHEN tasksOfRoot runs THEN it lists the tasks graphStateOfRoot lists', () => {
    const root = stateOf({ model: GRAPH_MODEL_STUB });
    const state = graphStateOfRoot(root, NO_LAYOUT_CACHES_STUB, GRAPH_SHOWN_STUB);
    const listed = state.kind === 'graph' ? state.tasks : NO_TASKS;

    expect(listed.length).toBeGreaterThan(0);
    expect(tasksOfRoot(root)).toStrictEqual(listed);
  });

  it('GIVEN no root state WHEN tasksOfRoot runs THEN it is empty', () => {
    expect(tasksOfRoot(undefined)).toStrictEqual([]);
  });

  it('GIVEN a root without a model WHEN tasksOfRoot runs THEN it is empty', () => {
    expect(tasksOfRoot(stateOf({ model: null }))).toStrictEqual([]);
  });
});
