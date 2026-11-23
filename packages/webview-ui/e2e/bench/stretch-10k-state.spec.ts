import { describe, expect, it } from 'vitest';

import type { GraphEdge } from '../../src/bridge/common/graph-state.type.ts';
import { tenKTasksSavedState, tenKTasksState } from '../test/utils/graph-10k-tasks.spec.util.ts';
import { TEN_K_FOLDERS, depIndexesOf, tenKGroupedSavedState, tenKPackagesState } from '../test/utils/graph-10k.spec.util.ts';
import { indexesOf } from '../test/utils/graph-large.spec.util.ts';

const isBackward = (edge: GraphEdge): boolean => edge.target < edge.source;

const depCountOf = (index: number): number => depIndexesOf(index).length;

const isDepCountInRange = (count: number): boolean => count >= 1 && count <= 3;

describe('FEATURE: 10k stretch states', () => {
  describe('GIVEN the 10k package state', () => {
    it('WHEN its parts are counted THEN it has 10,000 packages in 50 folders of 200 and no cached positions', () => {
      const state = tenKPackagesState();
      const folders = new Set(state.packages.map((pkg): string => pkg.path.split('/')[0] ?? ''));

      expect([state.packages.length, folders.size, state.positions]).toStrictEqual([10_000, 50, null]);
    });

    it('WHEN its edges are read THEN every edge points at an earlier package', () => {
      const { edges } = tenKPackagesState();

      expect(edges.every(isBackward)).toBe(true);
    });

    it('WHEN its dependency counts are read THEN every package but the first needs one to three others', () => {
      const counts = indexesOf(10_000).slice(1).map(depCountOf);

      expect(counts.every(isDepCountInRange)).toBe(true);
      expect(depCountOf(0)).toBe(0);
    });

    it('WHEN it is built twice THEN both builds are equal', () => {
      expect(tenKPackagesState()).toStrictEqual(tenKPackagesState());
    });
  });

  describe('GIVEN the 10k task state', () => {
    it('WHEN its tasks are counted THEN 2000 packages hold 10,000 tasks', () => {
      const state = tenKTasksState();

      expect([state.packages.length, state.tasks.length]).toStrictEqual([2000, 10_000]);
    });

    it('WHEN its saved state is read THEN every task is chosen and the cap is lifted', () => {
      const { task } = tenKTasksSavedState();

      expect([task?.chosen.length, task?.capLifted]).toStrictEqual([10_000, true]);
    });
  });

  describe('GIVEN the grouped saved state', () => {
    it('WHEN it is collapsed THEN all 50 folders are collapsed', () => {
      expect(tenKGroupedSavedState(true).collapsed).toStrictEqual(TEN_K_FOLDERS);
    });

    it('WHEN it is expanded THEN no folder is collapsed', () => {
      expect(tenKGroupedSavedState(false).collapsed).toStrictEqual([]);
    });
  });
});
