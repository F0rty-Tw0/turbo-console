import { describe, expect, it, vi } from 'vitest';

import { GraphTaskMemory } from './graph-task-memory.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { TaskMemoryModes, TaskNaming } from '../common/graph-task.type.ts';
import { SAVED_FLAT_STUB, SAVED_GROUPED_STUB } from '../test/stubs/graph-layouts.stub.ts';
import { ROOT_BUILD_STUB, SINGLE_TASK_STATE_STUB, TASK_CHAIN_STUB } from '../test/stubs/graph-task.stub.ts';
import { BARE_SHOWN_STUB } from '../test/stubs/scope-labels.stub.ts';

/** `web` in `apps`, `ui` and `core` in `packages`, each bare name `bare-<name>`, scopes shown, with the root task `//#build`. */
const MONOREPO_STATE: GraphReady = { ...BARE_SHOWN_STUB, tasks: [...TASK_CHAIN_STUB, ROOT_BUILD_STUB] };

const FOLDERS = new Map([
  ['web', 'apps'],
  ['ui', 'packages'],
  ['core', 'packages']
]);

const namingOf = (state: GraphReady, current: GraphViewState | null): TaskNaming => {
  const modes: TaskMemoryModes = { task: vi.fn(() => null), saveTask: vi.fn(), current: vi.fn(() => current) };
  const memory = new GraphTaskMemory(modes);

  memory.keep(state);

  return memory.naming();
};

describe('FEATURE: GraphTaskMemory naming', () => {
  describe('GIVEN a monorepo state', () => {
    it('WHEN the saved view is grouped THEN the naming is grouped', () => {
      expect(namingOf(MONOREPO_STATE, SAVED_GROUPED_STUB).grouped).toBe(true);
    });

    it('WHEN the saved view is ungrouped THEN the naming is ungrouped', () => {
      expect(namingOf(MONOREPO_STATE, SAVED_FLAT_STUB).grouped).toBe(false);
    });

    it('WHEN no view is saved THEN the naming is grouped, as a fresh view is', () => {
      expect(namingOf(MONOREPO_STATE, null).grouped).toBe(true);
    });

    it('WHEN the naming is read THEN each package maps to the folder its path sits in', () => {
      expect(namingOf(MONOREPO_STATE, null).folders).toStrictEqual(FOLDERS);
    });

    it('WHEN the naming is read THEN it carries the state scope bit', () => {
      expect(namingOf(MONOREPO_STATE, null).scopeShown).toBe(true);
    });

    it('WHEN scopes are shown THEN each package is labelled by its name', () => {
      const labels = new Map([
        ['web', 'web'],
        ['ui', 'ui'],
        ['core', 'core']
      ]);

      expect(namingOf(MONOREPO_STATE, null).labels).toStrictEqual(labels);
    });

    it('WHEN scopes are hidden THEN each package is labelled by its bare name', () => {
      const naming = namingOf({ ...MONOREPO_STATE, scopeShown: false }, null);
      const expected = new Map([
        ['web', 'bare-web'],
        ['ui', 'bare-ui'],
        ['core', 'bare-core']
      ]);

      expect(naming.labels).toStrictEqual(expected);
    });

    it('WHEN scopes are hidden THEN the scope bit is off', () => {
      const naming = namingOf({ ...MONOREPO_STATE, scopeShown: false }, null);

      expect(naming.scopeShown).toBe(false);
    });

    it('WHEN it holds tasks of the root // THEN neither the labels nor the folders hold //', () => {
      const { labels, folders } = namingOf(MONOREPO_STATE, null);

      expect([labels.has('//'), folders.has('//')]).toStrictEqual([false, false]);
    });
  });

  describe('GIVEN a monorepo state with scopes hidden', () => {
    it('WHEN the location facts are read THEN they carry the naming labels', () => {
      const state: GraphReady = { ...MONOREPO_STATE, scopeShown: false };
      const memory = new GraphTaskMemory({ task: vi.fn(() => null), saveTask: vi.fn(), current: vi.fn(() => null) });

      memory.keep(state);

      expect(memory.locationFacts(0).labels).toStrictEqual(memory.naming().labels);
      expect(memory.locationFacts(0).labels.get('web')).toBe('bare-web');
    });
  });

  describe('GIVEN a single-package state', () => {
    it('WHEN the saved view is grouped THEN the naming is still ungrouped', () => {
      expect(namingOf(SINGLE_TASK_STATE_STUB, SAVED_GROUPED_STUB).grouped).toBe(false);
    });

    it('WHEN no view is saved THEN the naming is ungrouped', () => {
      expect(namingOf(SINGLE_TASK_STATE_STUB, null).grouped).toBe(false);
    });
  });
});
