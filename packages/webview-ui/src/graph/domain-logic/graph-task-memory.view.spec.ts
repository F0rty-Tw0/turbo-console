import { describe, expect, it, vi } from 'vitest';

import { GraphTaskMemory } from './graph-task-memory.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { TaskModes } from '../common/graph-task.type.ts';
import { SAVED_FLAT_STUB, SAVED_GROUPED_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { SINGLE_TASK_STATE_STUB, TASK_STATE_STUB, WEB_BUILD_STUB, WEB_LINT_STUB } from '../test/stubs/graph-task.stub.ts';

type MemoryModes = Pick<TaskModes, 'task' | 'saveTask' | 'current'>;

/** `web#build`, a turbo task, and `web#lint` as a package script. */
const SCRIPT_STUB = { ...WEB_LINT_STUB, isTurboTask: false };

const turboState = (scriptsShown: boolean): GraphReady => {
  const state: GraphReady = { ...TASK_STATE_STUB, tasks: [WEB_BUILD_STUB], scriptsShown };

  return state;
};

const scriptState = (scriptsShown: boolean): GraphReady => {
  const state: GraphReady = { ...TASK_STATE_STUB, tasks: [WEB_BUILD_STUB, SCRIPT_STUB], scriptsShown };

  return state;
};

const memoryOf = (state: GraphReady, current: GraphViewState | null = null): GraphTaskMemory => {
  const modes: MemoryModes = { task: vi.fn(() => null), saveTask: vi.fn(), current: vi.fn(() => current) };
  const memory = new GraphTaskMemory(modes);

  memory.keep(state);

  return memory;
};

describe('FEATURE: GraphTaskMemory View checks', () => {
  describe('GIVEN a listing with a script while scripts are hidden', () => {
    it('WHEN the checks are read THEN Show scripts is unticked but still present, and the pool holds the turbo task only', () => {
      const memory = memoryOf(scriptState(false));

      expect(memory.viewChecks()).toMatchObject({ hasScripts: true, scriptsShown: false });
      expect(memory.tasks()).toStrictEqual([WEB_BUILD_STUB]);
    });
  });

  describe('GIVEN a listing with a script while scripts are shown', () => {
    it('WHEN the checks are read THEN Show scripts is present and ticked', () => {
      expect(memoryOf(scriptState(true)).viewChecks()).toMatchObject({ hasScripts: true, scriptsShown: true });
    });
  });

  describe('GIVEN a listing of turbo tasks only', () => {
    it('WHEN the checks are read THEN there is no script to show', () => {
      expect(memoryOf(turboState(true)).viewChecks().hasScripts).toBe(false);
    });
  });

  describe('GIVEN a monorepo state', () => {
    it('WHEN the saved view is ungrouped THEN Group by folder is unticked and applies', () => {
      expect(memoryOf(TASK_STATE_STUB, SAVED_FLAT_STUB).viewChecks()).toMatchObject({ grouped: false, canGroup: true });
    });

    it('WHEN no view is saved THEN Group by folder is ticked, as a fresh view is', () => {
      expect(memoryOf(TASK_STATE_STUB).viewChecks().grouped).toBe(true);
    });

    it('WHEN scopes are hidden THEN Show package scopes is unticked', () => {
      expect(memoryOf({ ...TASK_STATE_STUB, scopeShown: false }).viewChecks().scopeShown).toBe(false);
    });

    it('WHEN scopes are shown THEN Show package scopes is ticked', () => {
      expect(memoryOf(TASK_STATE_STUB).viewChecks().scopeShown).toBe(true);
    });
  });

  describe('GIVEN a single-package state under a grouped saved view', () => {
    it('WHEN the checks are read THEN Group by folder does not apply', () => {
      expect(memoryOf(SINGLE_TASK_STATE_STUB, SAVED_GROUPED_STUB).viewChecks().canGroup).toBe(false);
    });
  });
});
