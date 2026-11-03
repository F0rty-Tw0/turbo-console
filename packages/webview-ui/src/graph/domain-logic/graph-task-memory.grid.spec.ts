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
import { scriptOf } from '../test/utils/shown-set.spec.util.ts';

/** `web#lint` as a package script, not a turbo task. */
const SCRIPT_STUB: GraphTask = { ...WEB_LINT_STUB, isTurboTask: false };

const ROOT_FMT = scriptOf('//#fmt', []);

const SINGLE_TASKS = SINGLE_TASK_STATE_STUB.tasks;

/** The single-package root with its `//#fmt` script, scripts hidden. */
const SINGLE_HIDDEN_STATE: GraphReady = { ...SINGLE_TASK_STATE_STUB, tasks: [...SINGLE_TASKS, ROOT_FMT], scriptsShown: false };

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

  describe('GIVEN a saved choice of web#build and a script id outside the pool', () => {
    it('WHEN the chosen ids are read THEN they are the saved ids, outside-the-pool ones included', () => {
      const saved: TaskViewState = { ...TASK_VIEW_STUB, chosen: ['web#build', 'hidden#fmt'] };
      const memory = memoryOf(TASK_STATE_STUB, saved);

      const ids = memory.chosenIds();

      expect(ids).toStrictEqual(['web#build', 'hidden#fmt']);
    });
  });

  describe('GIVEN a single-package state whose saved choice names no pooled task, for the chosen ids', () => {
    it('WHEN the chosen ids are read THEN they are the saved id followed by every pool id', () => {
      const saved: TaskViewState = { ...TASK_VIEW_STUB, chosen: ['gone#x'] };
      const memory = memoryOf(SINGLE_TASK_STATE_STUB, saved);

      const ids = memory.chosenIds();

      expect(ids).toStrictEqual(['gone#x', '//#build', '//#lint']);
    });
  });

  describe('GIVEN a single-package state with scripts hidden whose saved choice is only the hidden script //#fmt', () => {
    it('WHEN the chosen ids are read THEN the hidden script id stays, followed by every pool id', () => {
      const saved: TaskViewState = { ...TASK_VIEW_STUB, chosen: [ROOT_FMT.id] };
      const memory = memoryOf(SINGLE_HIDDEN_STATE, saved);

      const ids = memory.chosenIds();

      expect(ids).toStrictEqual(['//#fmt', '//#build', '//#lint']);
    });
  });
});
