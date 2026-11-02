import { describe, expect, it } from 'vitest';

import { shownSetOf } from './shown-set.util.ts';
import { chainOf, depsAndDependentsOf, depsOf, fanOf, inputOf, taskOf } from '../test/utils/shown-set.spec.util.ts';

describe('FEATURE: shownSetOf cap order (D9)', () => {
  describe('GIVEN dependents and two dependency levels past the cap', () => {
    it('WHEN chosen + 250 dependency hop 1 + 60 hop 2 + 10 dependents make 321 THEN the dependents and hop 2 are cut, hop 1 is kept', () => {
      const shown = shownSetOf(inputOf(depsAndDependentsOf(250, 60, 10), { depth: 2 }));

      expect([shown.ids.length, shown.hiddenCount]).toStrictEqual([251, 70]);
    });
  });

  describe('GIVEN a dependents chain of three levels past the cap', () => {
    it('WHEN depth is 3 with 150, 100 and 100 tasks THEN the deepest level goes first and 251 stay', () => {
      const shown = shownSetOf(inputOf(chainOf([150, 100, 100]), { depth: 3 }));

      expect([shown.ids.length, shown.hiddenCount]).toStrictEqual([251, 100]);
    });
  });

  describe('GIVEN 400 dependencies at hop 1', () => {
    it('WHEN the cap is not lifted THEN every one stays and nothing is hidden', () => {
      const shown = shownSetOf(inputOf(depsOf(400, 0)));

      expect([shown.ids.length, shown.hiddenCount]).toStrictEqual([401, 0]);
    });
  });

  describe('GIVEN 400 dependents at hop 1', () => {
    it('WHEN the cap is lifted THEN all 401 tasks are drawn and nothing is hidden', () => {
      const shown = shownSetOf(inputOf(fanOf(400, 0), { capLifted: true }));

      expect([shown.ids.length, shown.hiddenCount]).toStrictEqual([401, 0]);
    });
  });

  describe('GIVEN 301 chosen tasks', () => {
    it('WHEN depth is 0 THEN all 301 are drawn and none is hidden', () => {
      const tasks = Array.from({ length: 301 }, (_slot, index) => taskOf(`c-${index}#t`, []));
      const chosen = tasks.map((task) => task.id);

      const shown = shownSetOf(inputOf(tasks, { chosen, depth: 0 }));

      expect([shown.ids.length, shown.hiddenCount]).toStrictEqual([301, 0]);
    });
  });
});
