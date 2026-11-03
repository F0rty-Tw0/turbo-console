import { describe, expect, it, vi } from 'vitest';

import { GraphTaskMemory } from './graph-task-memory.ts';
import type { GraphReady, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { TaskMemoryModes } from '../common/graph-task.type.ts';
import {
  SINGLE_TASK_STATE_STUB,
  TASK_STATE_STUB,
  TASK_VIEW_STUB,
  WEB_BUILD_STUB,
  WEB_LINT_STUB
} from '../test/stubs/graph-task.stub.ts';

/** `web#lint` as a package script, not a turbo task. */
const SCRIPT_STUB: GraphTask = { ...WEB_LINT_STUB, isTurboTask: false };

const memoryOf = (state: GraphReady, saved: TaskViewState | null = null): GraphTaskMemory => {
  const modes: TaskMemoryModes = { task: vi.fn(() => saved), saveTask: vi.fn(), current: vi.fn(() => null) };
  const memory = new GraphTaskMemory(modes);

  memory.keep(state);

  return memory;
};

describe('FEATURE: GraphTaskMemory grid facts', () => {
  describe('GIVEN a listing of a turbo task and a script with scripts hidden', () => {
    const state: GraphReady = { ...TASK_STATE_STUB, tasks: [WEB_BUILD_STUB, SCRIPT_STUB], scriptsShown: false };

    it('WHEN the facts are read THEN the tasks are the pool, without the script', () => {
      const shown = new Set(['web#build']);

      const facts = memoryOf(state).gridFacts(shown);

      expect(facts.tasks).toStrictEqual([WEB_BUILD_STUB]);
    });

    it('WHEN the facts are read THEN shown is the given set, the naming is the memory naming and the root label the state one', () => {
      const memory = memoryOf(state);
      const shown = new Set(['web#build']);

      const facts = memory.gridFacts(shown);

      expect(facts.shown).toBe(shown);
      expect(facts.naming).toStrictEqual(memory.naming());
      expect(facts.rootLabel).toBeNull();
    });
  });

  describe('GIVEN a saved choice of web#build', () => {
    it('WHEN the facts are read THEN chosen holds web#build', () => {
      const memory = memoryOf(TASK_STATE_STUB, TASK_VIEW_STUB);

      const facts = memory.gridFacts(new Set());

      expect(facts.chosen).toStrictEqual(new Set(['web#build']));
    });
  });

  describe('GIVEN a single-package state whose saved choice names no pooled task', () => {
    it('WHEN the facts are read THEN chosen holds every pool id and the root label is the state one', () => {
      const saved: TaskViewState = { ...TASK_VIEW_STUB, chosen: ['gone#x'] };
      const memory = memoryOf(SINGLE_TASK_STATE_STUB, saved);

      const facts = memory.gridFacts(new Set());

      expect(facts.chosen).toStrictEqual(new Set(['//#build', '//#lint']));
      expect(facts.rootLabel).toBe('single-app');
    });
  });
});
