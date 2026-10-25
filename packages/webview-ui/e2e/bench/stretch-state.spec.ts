import { describe, expect, it } from 'vitest';

import type { GraphAtomFile, GraphAtomGroup, GraphReady, GraphTask } from '../../src/bridge/common/graph-state.type.ts';
import { largeState } from '../test/utils/graph-large.spec.util.ts';
import { STRETCH_UMBRELLAS, stretchSavedState, stretchTasksState } from '../test/utils/graph-stretch.spec.util.ts';

const taskIdOf = (task: GraphTask): string => task.id;

const fileIdOf = (file: GraphAtomFile): string => file.id;

const filesOf = (state: GraphReady): string[] => state.atomGroups.flatMap((group) => group.files.map(fileIdOf));

const specPathOf = (file: GraphAtomFile): string => file.specPath;

const isLiveFile = (file: GraphAtomFile): boolean => file.isLive;

const firstGroupFiles = (): GraphAtomFile[] => {
  const group = stretchTasksState().atomGroups.at(0);

  if (group === undefined) throw new Error('the stretch state has no group');

  return group.files;
};

const umbrellaIdOf = (group: GraphAtomGroup): string => group.umbrellaId;

describe('FEATURE: stretch task state', () => {
  describe('GIVEN the built state', () => {
    it('WHEN its parts are counted THEN it has 300 packages, 1500 tasks and 20 groups of 200 files', () => {
      const state = stretchTasksState();
      const counts = [state.packages.length, state.tasks.length, state.atomGroups.length];

      expect(counts).toStrictEqual([300, 1500, 20]);
      expect(state.atomGroups.every((group) => group.files.length === 200)).toBe(true);
    });

    it('WHEN the umbrellas are matched to the tasks THEN every group umbrella is a listed task and no file id is', () => {
      const state = stretchTasksState();
      const taskIds = new Set(state.tasks.map(taskIdOf));
      const umbrellas = state.atomGroups.map(umbrellaIdOf);
      const files = filesOf(state);

      expect(umbrellas.every((umbrella) => taskIds.has(umbrella))).toBe(true);
      expect(files.some((file) => taskIds.has(file))).toBe(false);
    });

    it('WHEN the task ids are collected THEN none repeats', () => {
      const state = stretchTasksState();
      const ids = state.tasks.map(taskIdOf);

      expect(new Set(ids).size).toBe(ids.length);
    });

    it('WHEN the file ids are collected THEN none repeats', () => {
      const files = filesOf(stretchTasksState());

      expect(new Set(files).size).toBe(files.length);
    });

    it('WHEN the umbrellas are read THEN STRETCH_UMBRELLAS lists the 20 group umbrellas in group order', () => {
      const state = stretchTasksState();

      expect(STRETCH_UMBRELLAS).toStrictEqual(state.atomGroups.map(umbrellaIdOf));
      expect(STRETCH_UMBRELLAS).toHaveLength(20);
    });

    it('WHEN the umbrellas are read THEN they are the e2e-ci tasks of every 15th package', () => {
      const [first, second] = STRETCH_UMBRELLAS;

      expect(first).toBe('pkg-000#e2e-ci');
      expect(second).toBe('pkg-015#e2e-ci');
    });

    it('WHEN the other packages are read THEN each has a docs task in place of e2e-ci', () => {
      const state = stretchTasksState();
      const ids = new Set(state.tasks.map(taskIdOf));

      expect(ids.has('pkg-001#docs')).toBe(true);
      expect(ids.has('pkg-001#e2e-ci')).toBe(false);
      expect(ids.has('pkg-015#docs')).toBe(false);
    });

    it('WHEN a build is read THEN it needs the build of each package its package needs', () => {
      const state = stretchTasksState();
      const build = state.tasks.find((task) => task.id === 'pkg-002#build');

      expect(build?.dependencies).toStrictEqual(['pkg-001#build', 'pkg-000#build']);
    });

    it('WHEN an umbrella is read THEN it needs its package build', () => {
      const state = stretchTasksState();
      const umbrella = state.tasks.find((task) => task.id === 'pkg-015#e2e-ci');

      expect(umbrella?.dependencies).toStrictEqual(['pkg-015#build']);
    });

    it('WHEN the files of a group are read THEN they are spec-001 to spec-200, every 10th live', () => {
      const files = firstGroupFiles();
      const specs = files.map(specPathOf);
      const live = files.filter(isLiveFile).map(specPathOf);

      expect(specs.slice(0, 3)).toStrictEqual(['tests/spec-001.spec.ts', 'tests/spec-002.spec.ts', 'tests/spec-003.spec.ts']);
      expect(specs.at(-1)).toBe('tests/spec-200.live.spec.ts');
      expect(live).toHaveLength(20);
      expect(live.slice(0, 2)).toStrictEqual(['tests/spec-010.live.spec.ts', 'tests/spec-020.live.spec.ts']);
    });

    it('WHEN a file id is read THEN it is its umbrella id, two dashes and its spec path', () => {
      const [file] = firstGroupFiles();

      expect(file?.id).toBe('pkg-000#e2e-ci--tests/spec-001.spec.ts');
    });

    it('WHEN its hash is read THEN it differs from the large state', () => {
      expect(stretchTasksState().hash).not.toBe(largeState().hash);
    });

    it('WHEN its packages and edges are read THEN they are the large state ones', () => {
      const state = stretchTasksState();
      const large = largeState();

      expect(state.packages).toStrictEqual(large.packages);
      expect(state.edges).toStrictEqual(large.edges);
    });
  });

  describe('GIVEN the saved view', () => {
    it('WHEN its task view is read THEN it chooses every task with the cap lifted', () => {
      const saved = stretchSavedState();
      const state = stretchTasksState();

      expect(saved.task).toMatchObject({ capLifted: true });
      expect(saved.task?.chosen).toStrictEqual(state.tasks.map(taskIdOf));
    });

    it('WHEN its mode and hash are read THEN it is task mode of the stretch state', () => {
      const saved = stretchSavedState();

      expect(saved.mode).toBe('tasks');
      expect(saved.hash).toBe(stretchTasksState().hash);
    });
  });
});
