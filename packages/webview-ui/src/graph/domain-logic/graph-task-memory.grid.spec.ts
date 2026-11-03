import { beforeEach, describe, expect, it, vi } from 'vitest';

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

    const shown = new Set(['web#build']);
    let memory: GraphTaskMemory;

    beforeEach(() => {
      memory = memoryOf(state);
    });

    describe('WHEN the facts are read', () => {
      it('THEN the tasks are the pool, without the script', () => {
        const facts = memory.gridFacts(shown);

        expect(facts.tasks).toStrictEqual([WEB_BUILD_STUB]);
      });

      it('THEN shown is the given set', () => {
        const facts = memory.gridFacts(shown);

        expect(facts.shown).toBe(shown);
      });

      it('THEN the naming is the memory naming', () => {
        const facts = memory.gridFacts(shown);

        expect(facts.naming).toStrictEqual(memory.naming());
      });

      it('THEN the root label is the state one, none for a monorepo', () => {
        const facts = memory.gridFacts(shown);

        expect(facts.rootLabel).toBeNull();
      });
    });
  });

  describe('GIVEN a saved choice of web#build and hidden#fmt, a script id outside the pool', () => {
    let memory: GraphTaskMemory;

    beforeEach(() => {
      const saved: TaskViewState = { ...TASK_VIEW_STUB, chosen: ['web#build', 'hidden#fmt'] };

      memory = memoryOf(TASK_STATE_STUB, saved);
    });

    it('WHEN the facts are read THEN chosen holds both saved ids', () => {
      const facts = memory.gridFacts(new Set());

      expect(facts.chosen).toStrictEqual(new Set(['web#build', 'hidden#fmt']));
    });

    it('WHEN the chosen ids are read THEN they are the saved ids, outside-the-pool ones included', () => {
      const ids = memory.chosenIds();

      expect(ids).toStrictEqual(['web#build', 'hidden#fmt']);
    });
  });

  describe('GIVEN a single-package state whose saved choice names no pooled task', () => {
    let memory: GraphTaskMemory;

    beforeEach(() => {
      const saved: TaskViewState = { ...TASK_VIEW_STUB, chosen: ['gone#x'] };

      memory = memoryOf(SINGLE_TASK_STATE_STUB, saved);
    });

    describe('WHEN the facts are read', () => {
      it('THEN chosen holds the saved id and every pool id', () => {
        const facts = memory.gridFacts(new Set());

        expect(facts.chosen).toStrictEqual(new Set(['gone#x', '//#build', '//#lint']));
      });

      it('THEN the root label is the state one', () => {
        const facts = memory.gridFacts(new Set());

        expect(facts.rootLabel).toBe('single-app');
      });
    });

    it('WHEN the chosen ids are read THEN they are the saved id followed by every pool id', () => {
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
