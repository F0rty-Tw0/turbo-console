import { describe, expect, it } from 'vitest';

import { taskCountsDiffer } from './task-counts.util.ts';
import type { GraphPackage } from '../../bridge/common/graph-state.type.ts';

const pkgOf = (name: string, taskCount: number, path = `packages/${name}`): GraphPackage => {
  const built: GraphPackage = { name, path, tags: [], taskCount };

  return built;
};

describe('FEATURE: taskCountsDiffer', () => {
  describe('GIVEN the packages shown and a same-hash state', () => {
    it.each([
      {
        title: 'every count is the same',
        previous: [pkgOf('web', 1), pkgOf('ui', 2)],
        next: [pkgOf('web', 1), pkgOf('ui', 2)],
        expected: false
      },
      {
        title: 'one count changed',
        previous: [pkgOf('web', 1), pkgOf('ui', 2)],
        next: [pkgOf('web', 1), pkgOf('ui', 3)],
        expected: true
      },
      { title: 'a package has no counterpart', previous: [pkgOf('web', 1)], next: [pkgOf('web', 1), pkgOf('ui', 0)], expected: true },
      { title: 'a __proto__ count changed', previous: [pkgOf('__proto__', 1)], next: [pkgOf('__proto__', 2)], expected: true },
      { title: 'only a path changed', previous: [pkgOf('web', 1, 'a')], next: [pkgOf('web', 1, 'b')], expected: false }
    ])('WHEN $title THEN the answer is $expected', ({ previous, next, expected }) => {
      const isChanged = taskCountsDiffer(previous, next);

      expect(isChanged).toBe(expected);
    });
  });
});
