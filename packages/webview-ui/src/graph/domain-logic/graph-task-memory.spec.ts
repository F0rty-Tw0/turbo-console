import { describe, expect, it, vi } from 'vitest';

import { GraphTaskMemory } from './graph-task-memory.ts';
import type { GraphReady } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { TaskModes } from '../common/graph-task.type.ts';
import { SINGLE_TASK_STATE_STUB, TASK_STATE_STUB, TASK_VIEW_STUB } from '../test/stubs/graph-task.stub.ts';
import { freshTaskViewOf } from '../utils/fresh-view-state.util.ts';

type MemoryModes = Pick<TaskModes, 'task' | 'saveTask'>;

const modesOf = (saved: TaskViewState | null): MemoryModes => {
  const modes: MemoryModes = { task: vi.fn(() => saved), saveTask: vi.fn() };

  return modes;
};

describe('FEATURE: task mode memory', () => {
  describe('GIVEN no state kept', () => {
    it('WHEN read THEN there are no tasks and an empty hash', () => {
      const memory = new GraphTaskMemory(modesOf(null));

      expect({ tasks: memory.tasks(), hash: memory.hash() }).toStrictEqual({ tasks: [], hash: '' });
    });
  });

  describe('GIVEN a state kept', () => {
    it('WHEN read THEN the state’s tasks and hash come back', () => {
      const memory = new GraphTaskMemory(modesOf(null));

      memory.keep(TASK_STATE_STUB);

      expect({ tasks: memory.tasks(), hash: memory.hash() }).toStrictEqual({
        tasks: TASK_STATE_STUB.tasks,
        hash: TASK_STATE_STUB.hash
      });
    });
  });

  describe('GIVEN no saved task view', () => {
    it('WHEN the view is read THEN it is the fresh one', () => {
      const memory = new GraphTaskMemory(modesOf(null));

      expect(memory.view()).toStrictEqual(freshTaskViewOf());
    });

    it('WHEN an edit is saved THEN the fresh view with the edit is saved under the kept hash', () => {
      const modes = modesOf(null);
      const memory = new GraphTaskMemory(modes);

      const fresh = freshTaskViewOf();

      memory.keep(TASK_STATE_STUB);
      memory.save({ depth: 2 });

      expect(modes.saveTask).toHaveBeenCalledWith({ ...fresh, depth: 2 }, TASK_STATE_STUB.hash);
    });

    it('WHEN the shown set is read THEN it is built from the kept tasks and the fresh view', () => {
      const memory = new GraphTaskMemory(modesOf(null));

      memory.keep(TASK_STATE_STUB);

      expect(memory.shownSet().ids).toStrictEqual([]);
    });
  });

  describe('GIVEN a saved task view', () => {
    it('WHEN the view is read THEN it is the saved one', () => {
      const memory = new GraphTaskMemory(modesOf(TASK_VIEW_STUB));

      expect(memory.view()).toStrictEqual(TASK_VIEW_STUB);
    });

    it('WHEN an edit is saved THEN the saved view with the edit is saved', () => {
      const modes = modesOf(TASK_VIEW_STUB);
      const memory = new GraphTaskMemory(modes);

      memory.save({ search: 'web' });

      expect(modes.saveTask).toHaveBeenCalledWith({ ...TASK_VIEW_STUB, search: 'web' }, '');
    });

    it('WHEN the shown set is read THEN the chosen task and its dependency are shown', () => {
      const memory = new GraphTaskMemory(modesOf(TASK_VIEW_STUB));

      memory.keep(TASK_STATE_STUB);

      expect(memory.shownSet().ids).toStrictEqual(['api#build', 'web#build']);
    });
  });

  describe('GIVEN a state of //#build and //#lint', () => {
    it.each([
      ['single-package', [], ['//#build', '//#lint'], true],
      ['single-package', ['//#gone'], ['//#build', '//#lint'], true],
      ['single-package', ['//#gone', '//#lint'], ['//#lint'], true],
      ['monorepo', [], [], false]
    ])('GIVEN %s with %j chosen WHEN the shown set is read THEN it lists %j', (_kind, chosen, ids, singlePackage) => {
      const saved: TaskViewState = { ...TASK_VIEW_STUB, chosen };
      const memory = new GraphTaskMemory(modesOf(saved));
      const state: GraphReady = { ...SINGLE_TASK_STATE_STUB, singlePackage };

      memory.keep(state);

      expect(memory.shownSet().ids).toStrictEqual(ids);
    });

    it('GIVEN single-package with nothing chosen WHEN the shown set is read twice THEN nothing is saved', () => {
      const modes = modesOf(null);
      const memory = new GraphTaskMemory(modes);

      memory.keep(SINGLE_TASK_STATE_STUB);
      memory.shownSet();
      memory.shownSet();

      expect(modes.saveTask).not.toHaveBeenCalled();
    });

    it.each([
      [true, 'single-app'],
      [false, null]
    ])('GIVEN singlePackage %s WHEN the root label is read THEN it is %j', (singlePackage, label) => {
      const memory = new GraphTaskMemory(modesOf(null));
      const state: GraphReady = { ...SINGLE_TASK_STATE_STUB, singlePackage, rootLabel: label };

      memory.keep(state);

      expect(memory.rootLabel()).toBe(label);
    });
  });
});
