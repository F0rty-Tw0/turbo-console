import type { ElkNode } from 'elkjs/lib/elk-api.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphTaskMode } from './graph-task-mode.ts';
import { ViewStateModes } from './view-state-modes.ts';
import type { GraphReady, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { ViewStateSaver } from '../common/graph-page.type.ts';
import type { TaskModeRig } from '../test/common/graph-task-mode.type.ts';
import { GROUPED_NAMING_STUB, SINGLE_TASK_STATE_STUB, TASK_CHAIN_STUB, TASK_STATE_STUB } from '../test/stubs/graph-task.stub.ts';
import { resultOf } from '../test/utils/graph-layouts.spec.util.ts';
import { taskModeRigOf, taskSavedOf } from '../test/utils/graph-task-mode.spec.util.ts';
import { taskLayoutKeyOf } from '../utils/elk-task-graph.util.ts';
import { folderIdOf } from '../utils/folder-id.util.ts';

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 10, y: 120 };

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT };

/** `web#build` chosen at depth 1: itself and the `api#build` it needs. */
const SHOWN = new Set(['api#build', 'web#build']);

const GROUPED_KEY = taskLayoutKeyOf(TASK_CHAIN_STUB, SHOWN, new Map(), GROUPED_NAMING_STUB);

const SAVED: GraphViewState = taskSavedOf({});

const UNGROUPED_SAVED: GraphViewState = { ...SAVED, grouped: false };

const SCOPES_HIDDEN_STATE: GraphReady = { ...TASK_STATE_STUB, scopeShown: false };

const childIdsOf = (graph: ElkNode): string[] => {
  const children = graph.children ?? [];

  return children.map((child) => child.id);
};

describe('FEATURE: GraphTaskMode box naming', () => {
  let rig: TaskModeRig;
  let mode: GraphTaskMode;
  let modes: ViewStateModes;

  beforeEach(() => {
    const saver: ViewStateSaver = { schedule: vi.fn(), flush: vi.fn() };

    modes = new ViewStateModes(saver, SAVED);
    rig = taskModeRigOf(modes);
    mode = new GraphTaskMode(rig.deps);
  });

  describe('GIVEN task mode showing a grouped layout', () => {
    beforeEach(async () => {
      mode.received(TASK_STATE_STUB, 7);
      await rig.runs.settle(0, resultOf(GROUPED_KEY, POSITIONS));
    });

    it('WHEN it was laid out THEN its packages sat in the root folder compound', () => {
      expect(childIdsOf(rig.runs.graphOf(0))).toStrictEqual([folderIdOf('')]);
    });

    it('WHEN the saved view turns ungrouped and a same-hash state arrives THEN exactly one new layout runs, flat', () => {
      vi.spyOn(modes, 'current').mockReturnValue(UNGROUPED_SAVED);
      mode.received(TASK_STATE_STUB, 9);

      expect(rig.runs.count()).toBe(2);
      expect(childIdsOf(rig.runs.graphOf(1))).toStrictEqual(['pkg:api', 'pkg:web']);
    });

    it('WHEN the grouping flips and back THEN the grouped layout comes from memory with no run', async () => {
      const current = vi.spyOn(modes, 'current').mockReturnValue(UNGROUPED_SAVED);

      mode.received(TASK_STATE_STUB, 9);
      await rig.runs.settle(1, resultOf(mode.layout.key() ?? '', POSITIONS));
      current.mockReturnValue(SAVED);
      mode.received(TASK_STATE_STUB, 11);

      expect(rig.runs.count()).toBe(2);
      expect(mode.layout.placedKey()).toBe(GROUPED_KEY);
    });

    it('WHEN a same-hash state arrives with scopes hidden THEN exactly one new layout runs', () => {
      mode.received(SCOPES_HIDDEN_STATE, 9);

      expect(rig.runs.count()).toBe(2);
    });
  });

  describe('GIVEN a single-package state under a grouped saved view', () => {
    it('WHEN it is laid out THEN its box is not in a folder compound', () => {
      mode.received(SINGLE_TASK_STATE_STUB, 7);

      expect(childIdsOf(rig.runs.graphOf(0))).toStrictEqual(['pkg://']);
    });
  });
});
