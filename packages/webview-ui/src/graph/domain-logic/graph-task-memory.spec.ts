import { describe, expect, it, vi } from 'vitest';

import { GraphTaskMemory } from './graph-task-memory.ts';
import type { GraphReady, GraphTask } from '../../bridge/common/graph-state.type.ts';
import type { TaskViewState } from '../../bridge/common/graph-view-state.type.ts';
import type { TaskModes } from '../common/graph-task.type.ts';
import type { LocationFacts } from '../common/location.type.ts';
import type { ShownSet } from '../common/shown-set.type.ts';
import {
  MORE_TASKS_STATE_STUB,
  ROOT_BUILD_STUB,
  SINGLE_TASK_STATE_STUB,
  TASK_STATE_STUB,
  TASK_VIEW_STUB
} from '../test/stubs/graph-task.stub.ts';
import { scriptOf, taskOf } from '../test/utils/shown-set.spec.util.ts';
import { freshTaskViewOf } from '../utils/fresh-view-state.util.ts';

type MemoryModes = Pick<TaskModes, 'task' | 'saveTask' | 'current'>;

/** A monorepo state whose only tasks are the workspace root's. */
const ROOT_TASKS_STATE: GraphReady = { ...SINGLE_TASK_STATE_STUB, singlePackage: false };

const APP_BUILD = taskOf('app#build', []);

const APP_DEV = scriptOf('app#dev', []);

const LIB_BUILD = taskOf('lib#build', []);

/** `app#build` and `lib#build` are turbo tasks, `app#dev` is a package script; scripts are hidden. */
const SCRIPTS_HIDDEN_STATE: GraphReady = { ...TASK_STATE_STUB, tasks: [APP_BUILD, APP_DEV, LIB_BUILD], scriptsShown: false };

const idsOf = (tasks: GraphTask[]): string[] => tasks.map((task) => task.id);

type FactsRow = [title: string, state: GraphReady, chosen: string[], facts: Omit<LocationFacts, 'labels'>];

const FACTS_ROWS: FactsRow[] = [
  [
    'one package, its chain pulled in',
    TASK_STATE_STUB,
    ['web#build', 'web#lint'],
    { taskPackage: 'web', taskCount: 3, isSinglePackage: false }
  ],
  ['two packages', TASK_STATE_STUB, ['web#build', 'api#build'], { taskPackage: null, taskCount: 2, isSinglePackage: false }],
  ['none', TASK_STATE_STUB, [], { taskPackage: null, taskCount: 0, isSinglePackage: false }],
  [
    'one package, a dependent shown',
    MORE_TASKS_STATE_STUB,
    ['web#build'],
    { taskPackage: 'web', taskCount: 3, isSinglePackage: false }
  ],
  [
    'an unknown id beside a known one',
    TASK_STATE_STUB,
    ['web#build', 'gone#build'],
    { taskPackage: 'web', taskCount: 2, isSinglePackage: false }
  ],
  [
    'only workspace root tasks',
    ROOT_TASKS_STATE,
    ['//#build', '//#lint'],
    { taskPackage: null, taskCount: 2, isSinglePackage: false }
  ],
  ['nothing, in a single package', SINGLE_TASK_STATE_STUB, [], { taskPackage: null, taskCount: 2, isSinglePackage: true }]
];

const modesOf = (saved: TaskViewState | null): MemoryModes => {
  const modes: MemoryModes = { task: vi.fn(() => saved), saveTask: vi.fn(), current: vi.fn(() => null) };

  return modes;
};

const scriptNeedingRoot = (id: string): GraphTask => scriptOf(id, ['root#t']);

const turboIdsOf = (prefix: string, count: number): string[] => Array.from({ length: count }, (_slot, index) => `${prefix}${index}#t`);

/** `root#t` needing `dependencies` turbo tasks, with `scripts` package scripts and `extra` more tasks that each need `root#t`. */
const capStateOf = (dependencies: number, scripts: number, extra: GraphTask[], scriptsShown: boolean): GraphReady => {
  const below = turboIdsOf('u-', dependencies);
  const scriptTasks = turboIdsOf('s-', scripts).map(scriptNeedingRoot);
  const leaves = below.map((id) => taskOf(id, []));
  const tasks = [taskOf('root#t', below), ...leaves, ...scriptTasks, ...extra];
  const state: GraphReady = { ...TASK_STATE_STUB, tasks, scriptsShown };

  return state;
};

const savedChoosing = (chosen: string[]): TaskViewState => {
  const saved: TaskViewState = { ...TASK_VIEW_STUB, chosen };

  return saved;
};

const cappedBy = (state: GraphReady): ShownSet => {
  const memory = new GraphTaskMemory(modesOf(savedChoosing(['root#t'])));

  memory.keep(state);

  return memory.shownSet();
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
    describe.each([
      ['single-package', [], ['//#build', '//#lint'], true],
      ['single-package', ['//#gone'], ['//#build', '//#lint'], true],
      ['single-package', ['//#gone', '//#lint'], ['//#lint'], true],
      ['monorepo', [], [], false]
    ])('AND %s with %j chosen', (_kind, chosen, ids, singlePackage) => {
      it('WHEN the shown set is read THEN it lists the expected ids', () => {
        const saved: TaskViewState = { ...TASK_VIEW_STUB, chosen };
        const memory = new GraphTaskMemory(modesOf(saved));
        const state: GraphReady = { ...SINGLE_TASK_STATE_STUB, singlePackage };

        memory.keep(state);

        expect(memory.shownSet().ids).toStrictEqual(ids);
      });
    });

    describe('AND single-package with nothing chosen', () => {
      it('WHEN the shown set is read twice THEN nothing is saved', () => {
        const modes = modesOf(null);
        const memory = new GraphTaskMemory(modes);

        memory.keep(SINGLE_TASK_STATE_STUB);
        memory.shownSet();
        memory.shownSet();

        expect(modes.saveTask).not.toHaveBeenCalled();
      });
    });

    describe.each([
      [true, 'single-app'],
      [false, null]
    ])('AND singlePackage %s', (singlePackage, label) => {
      it('WHEN the root label is read THEN it is the state’s label', () => {
        const memory = new GraphTaskMemory(modesOf(null));
        const state: GraphReady = { ...SINGLE_TASK_STATE_STUB, singlePackage, rootLabel: label };

        memory.keep(state);

        expect(memory.rootLabel()).toBe(label);
      });
    });
  });

  describe.each(FACTS_ROWS)('GIVEN %s chosen', (_title, state, chosen, facts) => {
    it('WHEN the location facts are read with the shown set’s count THEN they name the one package, carry the count and flag a single package', () => {
      const saved: TaskViewState = { ...TASK_VIEW_STUB, chosen };
      const memory = new GraphTaskMemory(modesOf(saved));

      memory.keep(state);

      const { ids } = memory.shownSet();

      expect(memory.locationFacts(ids.length)).toStrictEqual({ ...facts, labels: memory.naming().labels });
    });
  });

  describe('GIVEN a state with a script and scripts hidden', () => {
    it('WHEN kept THEN tasks() is the pool and listed() the full listing', () => {
      const memory = new GraphTaskMemory(modesOf(null));

      memory.keep(SCRIPTS_HIDDEN_STATE);

      expect([idsOf(memory.tasks()), idsOf(memory.listed())]).toStrictEqual([
        ['app#build', 'lib#build'],
        ['app#build', 'app#dev', 'lib#build']
      ]);
    });

    it('WHEN a state of the same hash with scriptsShown true is kept THEN tasks() grows to three', () => {
      const memory = new GraphTaskMemory(modesOf(null));
      const shown: GraphReady = { ...SCRIPTS_HIDDEN_STATE, scriptsShown: true };

      memory.keep(SCRIPTS_HIDDEN_STATE);
      memory.keep(shown);

      expect(idsOf(memory.tasks())).toStrictEqual(['app#build', 'app#dev', 'lib#build']);
    });

    it('WHEN the hidden script is chosen with app#build THEN nothing is dropped and the script is not drawn', () => {
      const memory = new GraphTaskMemory(modesOf(savedChoosing(['app#build', 'app#dev'])));

      memory.keep(SCRIPTS_HIDDEN_STATE);

      expect(memory.shownSet()).toMatchObject({ ids: ['app#build'], droppedIds: [] });
    });

    it('WHEN an id missing from the whole listing is chosen THEN it is dropped', () => {
      const memory = new GraphTaskMemory(modesOf(savedChoosing(['app#build', 'gone#build'])));

      memory.keep(SCRIPTS_HIDDEN_STATE);

      expect(memory.shownSet()).toMatchObject({ ids: ['app#build'], droppedIds: ['gone#build'] });
    });
  });

  describe('GIVEN a single-package root with a turbo task, a script and scripts hidden', () => {
    it('WHEN only the hidden script is chosen THEN the fallback shows the pool, as if nothing were chosen', () => {
      const tasks = [ROOT_BUILD_STUB, scriptOf('//#dev', [])];
      const state: GraphReady = { ...SINGLE_TASK_STATE_STUB, tasks, scriptsShown: false };
      const memory = new GraphTaskMemory(modesOf(savedChoosing(['//#dev'])));

      memory.keep(state);

      expect(memory.shownSet().ids).toStrictEqual(['//#build']);
    });
  });

  describe('GIVEN chosen root#t, 299 turbo hop-1 dependencies and 40 script hop-1 dependents', () => {
    it('WHEN scripts are hidden THEN the pool is 300 and nothing is hidden', () => {
      const shown = cappedBy(capStateOf(299, 40, [], false));

      expect([shown.ids.length, shown.hiddenCount]).toStrictEqual([300, 0]);
    });

    it('WHEN scripts are shown THEN the pool is 340, the dependents level is cut and 40 are hidden', () => {
      const shown = cappedBy(capStateOf(299, 40, [], true));

      expect([shown.ids.length, shown.hiddenCount]).toStrictEqual([300, 40]);
    });
  });

  describe('GIVEN chosen root#t, 299 turbo dependencies and a //#gen turbo task that needs root#t', () => {
    it('WHEN the shown set is read THEN //#gen counts toward the cap and is cut', () => {
      const shown = cappedBy(capStateOf(299, 0, [taskOf('//#gen', ['root#t'])], false));

      expect([shown.ids.includes('//#gen'), shown.ids.length, shown.hiddenCount]).toStrictEqual([false, 300, 1]);
    });
  });
});
