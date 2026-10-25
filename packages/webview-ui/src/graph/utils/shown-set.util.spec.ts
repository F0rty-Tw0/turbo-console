import { describe, expect, it } from 'vitest';

import { shownSetOf } from './shown-set.util.ts';
import type { GraphTask } from '../../bridge/common/graph-state.type.ts';
import { arrayReadsOf, depsOf, fanOf, mixOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

const DIAMOND: GraphTask[] = [
  taskOf('a#build', ['b#build', 'c#build']),
  taskOf('b#build', ['d#build']),
  taskOf('c#build', ['d#build']),
  taskOf('d#build', []),
  taskOf('e#build', ['a#build']),
  taskOf('f#build', ['e#build']),
  taskOf('g#test', ['a#build'])
];

describe('FEATURE: shownSetOf', () => {
  describe('GIVEN a diamond with dependents', () => {
    it.each([
      [0, ['a#build', 'b#build', 'c#build', 'd#build']],
      [1, ['a#build', 'b#build', 'c#build', 'd#build', 'e#build', 'g#test']],
      [2, ['a#build', 'b#build', 'c#build', 'd#build', 'e#build', 'f#build', 'g#test']]
    ])('GIVEN a#build chosen WHEN depth is %i THEN the chain and that many dependent hops show', (depth, ids) => {
      const shown = shownSetOf({ tasks: DIAMOND, chosen: ['a#build'], depth, capLifted: false });

      expect(shown).toStrictEqual({ ids, hiddenCount: 0, droppedIds: [] });
    });

    it('WHEN an unknown id is chosen too THEN it is dropped and the rest still shows', () => {
      const shown = shownSetOf({ tasks: DIAMOND, chosen: ['zzz#none', 'd#build'], depth: 0, capLifted: false });

      expect(shown).toStrictEqual({ ids: ['d#build'], hiddenCount: 0, droppedIds: ['zzz#none'] });
    });

    it('WHEN every chosen id is unknown THEN nothing shows', () => {
      const shown = shownSetOf({ tasks: DIAMOND, chosen: ['zzz#none'], depth: 1, capLifted: false });

      expect(shown).toStrictEqual({ ids: [], hiddenCount: 0, droppedIds: ['zzz#none'] });
    });

    it('WHEN the dropped ids repeat THEN they are listed once, sorted', () => {
      const shown = shownSetOf({ tasks: DIAMOND, chosen: ['zz#x', 'aa#x', 'zz#x'], depth: 0, capLifted: false });

      expect(shown.droppedIds).toStrictEqual(['aa#x', 'zz#x']);
    });

    it('WHEN two chained tasks are chosen at depth 0 THEN each task shows once', () => {
      const shown = shownSetOf({ tasks: DIAMOND, chosen: ['a#build', 'e#build'], depth: 0, capLifted: false });

      expect(shown.ids).toStrictEqual(['a#build', 'b#build', 'c#build', 'd#build', 'e#build']);
    });

    it('WHEN the chosen id repeats THEN it shows once', () => {
      const shown = shownSetOf({ tasks: DIAMOND, chosen: ['d#build', 'd#build'], depth: 0, capLifted: false });

      expect(shown.ids).toStrictEqual(['d#build']);
    });
  });

  describe('GIVEN a task that depends on an id outside the task list', () => {
    it('WHEN it is chosen THEN the missing dependency is skipped', () => {
      const tasks = [taskOf('a#t', ['gone#t'])];

      const shown = shownSetOf({ tasks, chosen: ['a#t'], depth: 1, capLifted: false });

      expect(shown).toStrictEqual({ ids: ['a#t'], hiddenCount: 0, droppedIds: [] });
    });
  });

  describe('GIVEN a task in both the dependency and the dependent hops of another', () => {
    it('WHEN the chosen task sits in a cycle THEN the cycle shows once and ends', () => {
      const tasks = [taskOf('a#t', ['b#t']), taskOf('b#t', ['a#t'])];

      const shown = shownSetOf({ tasks, chosen: ['a#t'], depth: 2, capLifted: false });

      expect(shown.ids).toStrictEqual(['a#t', 'b#t']);
    });
  });

  describe('GIVEN more tasks than the cap', () => {
    it('WHEN 250 dependents at hop 1 and 100 at hop 2 THEN hop 2 is cut', () => {
      const shown = shownSetOf({ tasks: fanOf(250, 100), chosen: ['root#t'], depth: 2, capLifted: false });

      expect(shown).toMatchObject({ hiddenCount: 100 });
    });

    it('WHEN 250 dependents at hop 1 and 100 at hop 2 THEN the hop-1 tasks still show', () => {
      const shown = shownSetOf({ tasks: fanOf(250, 100), chosen: ['root#t'], depth: 2, capLifted: false });

      expect(shown.ids).toHaveLength(251);
    });

    it('WHEN 400 dependents at hop 1 THEN all of them are cut', () => {
      const shown = shownSetOf({ tasks: fanOf(400, 0), chosen: ['root#t'], depth: 1, capLifted: false });

      expect(shown).toStrictEqual({ ids: ['root#t'], hiddenCount: 400, droppedIds: [] });
    });

    it('WHEN 305 dependencies at hop 1 and 10 at hop 2 THEN hop 1 stays over the cap', () => {
      const shown = shownSetOf({ tasks: depsOf(305, 10), chosen: ['root#t'], depth: 0, capLifted: false });

      expect(shown).toMatchObject({ hiddenCount: 10 });
      expect(shown.ids).toHaveLength(306);
    });

    // Counts reads, not wall time: a dependents index that copies its list per push reads about 2000 per task here.
    it('WHEN 4000 dependents at hop 1 THEN each task is read fewer than 100 times', () => {
      const tasks = fanOf(4000, 0);

      const reads = arrayReadsOf(() => shownSetOf({ tasks, chosen: ['root#t'], depth: 1, capLifted: false }));

      expect(reads).toBeLessThan(100 * tasks.length);
    });

    it('WHEN 299 dependencies and 1 dependent make 301 THEN the dependent is cut', () => {
      const shown = shownSetOf({ tasks: mixOf(299, 1), chosen: ['root#t'], depth: 1, capLifted: false });

      expect(shown).toMatchObject({ hiddenCount: 1 });
      expect(shown.ids).toHaveLength(300);
    });

    it('WHEN 298 dependencies and 1 dependent make exactly 300 THEN nothing is cut', () => {
      const shown = shownSetOf({ tasks: mixOf(298, 1), chosen: ['root#t'], depth: 1, capLifted: false });

      expect(shown).toMatchObject({ hiddenCount: 0 });
      expect(shown.ids).toHaveLength(300);
    });

    it('WHEN the cap is lifted THEN nothing is cut', () => {
      const shown = shownSetOf({ tasks: fanOf(400, 0), chosen: ['root#t'], depth: 1, capLifted: true });

      expect(shown).toMatchObject({ hiddenCount: 0 });
      expect(shown.ids).toHaveLength(401);
    });
  });
});
