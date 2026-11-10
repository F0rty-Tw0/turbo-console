import { describe, expect, it, vi } from 'vitest';

import { GraphTaskMemory } from './graph-task-memory.ts';
import type { GraphReady, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { TaskMemoryModes } from '../common/graph-task.type.ts';
import { SAVED_FLAT_STUB, SAVED_GROUPED_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { SINGLE_TASK_STATE_STUB, TASK_STATE_STUB, WEB_BUILD_STUB, WEB_LINT_STUB } from '../test/stubs/graph-task.stub.ts';

/** `web#lint` as a package script, not a turbo task. */
const SCRIPT_STUB: GraphTask = { ...WEB_LINT_STUB, isTurboTask: false };

const turboState = (scriptsShown: boolean): GraphReady => {
  const state: GraphReady = { ...TASK_STATE_STUB, tasks: [WEB_BUILD_STUB], scriptsShown };

  return state;
};

const scriptState = (scriptsShown: boolean): GraphReady => {
  const state: GraphReady = { ...TASK_STATE_STUB, tasks: [WEB_BUILD_STUB, SCRIPT_STUB], scriptsShown };

  return state;
};

const memoryOf = (state: GraphReady, current: GraphViewState | null = null): GraphTaskMemory => {
  const modes: TaskMemoryModes = { task: vi.fn(() => null), saveTask: vi.fn(), current: vi.fn(() => current) };
  const memory = new GraphTaskMemory(modes);

  memory.keep(state);

  return memory;
};

describe('FEATURE: GraphTaskMemory View checks', () => {
  describe('GIVEN a state with the cache prediction shown', () => {
    it('WHEN the checks are read THEN Show cache prediction is ticked', () => {
      const state: GraphReady = { ...TASK_STATE_STUB, predictionShown: true };
      const checks = memoryOf(state).viewChecks();

      expect(checks.predictionShown).toBe(true);
    });
  });

  describe('GIVEN a state with the cache prediction hidden', () => {
    it('WHEN the checks are read THEN Show cache prediction is unticked', () => {
      const checks = memoryOf(TASK_STATE_STUB).viewChecks();

      expect(checks.predictionShown).toBe(false);
    });
  });

  describe('GIVEN a listing with a script while scripts are hidden', () => {
    it('WHEN the checks are read THEN Show scripts is unticked but still present', () => {
      const checks = memoryOf(scriptState(false)).viewChecks();

      expect(checks).toMatchObject({ hasScripts: true, scriptsShown: false });
    });

    it('WHEN the pool is read THEN it holds the turbo task only', () => {
      const tasks = memoryOf(scriptState(false)).tasks();

      expect(tasks).toStrictEqual([WEB_BUILD_STUB]);
    });
  });

  describe('GIVEN a listing with a script while scripts are shown', () => {
    it('WHEN the checks are read THEN Show scripts is present and ticked', () => {
      const checks = memoryOf(scriptState(true)).viewChecks();

      expect(checks).toMatchObject({ hasScripts: true, scriptsShown: true });
    });
  });

  describe('GIVEN a listing of turbo tasks only', () => {
    it('WHEN the checks are read THEN there is no script to show', () => {
      const checks = memoryOf(turboState(true)).viewChecks();

      expect(checks.hasScripts).toBe(false);
    });
  });

  describe('GIVEN a monorepo state', () => {
    it('WHEN the saved view is ungrouped THEN Group by folder is unticked and applies', () => {
      const checks = memoryOf(TASK_STATE_STUB, SAVED_FLAT_STUB).viewChecks();

      expect(checks).toMatchObject({ grouped: false, canGroup: true });
    });

    it('WHEN no view is saved THEN Group by folder is ticked, as a fresh view is', () => {
      const checks = memoryOf(TASK_STATE_STUB).viewChecks();

      expect(checks.grouped).toBe(true);
    });

    it('WHEN scopes are hidden THEN Show package scopes is unticked', () => {
      const checks = memoryOf({ ...TASK_STATE_STUB, scopeShown: false }).viewChecks();

      expect(checks.scopeShown).toBe(false);
    });

    it('WHEN scopes are shown THEN Show package scopes is ticked', () => {
      const checks = memoryOf(TASK_STATE_STUB).viewChecks();

      expect(checks.scopeShown).toBe(true);
    });
  });

  describe('GIVEN a single-package state under a grouped saved view', () => {
    it('WHEN the checks are read THEN Group by folder does not apply', () => {
      const checks = memoryOf(SINGLE_TASK_STATE_STUB, SAVED_GROUPED_STUB).viewChecks();

      expect(checks.canGroup).toBe(false);
    });
  });
});
