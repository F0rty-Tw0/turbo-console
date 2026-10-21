import { describe, expect, it } from 'vitest';

import { selectionText } from './selection-text.util.ts';
import type { Closure } from '../common/closure.type.ts';
import type { Neighbours } from '../common/neighbours.type.ts';

const namesOf = (prefix: string, count: number): string[] => {
  const names = Array.from({ length: count }, (_, index): string => `${prefix}${index}`);

  return names;
};

const closure = (dependencies: number, dependents: number): Closure => {
  const dependencyNames = namesOf('d', dependencies);
  const dependentNames = namesOf('p', dependents);
  const built: Closure = { dependencies: new Set(dependencyNames), dependents: new Set(dependentNames) };

  return built;
};

const direct = (dependencies: number, dependents: number): Neighbours => {
  const dependencyNames = namesOf('d', dependencies);
  const dependentNames = namesOf('p', dependents);
  const built: Neighbours = { dependencies: dependencyNames, dependents: dependentNames };

  return built;
};

describe('FEATURE: selectionText', () => {
  describe('GIVEN a selected package', () => {
    it.each([
      {
        title: 'it has many of each',
        name: 'web',
        all: closure(3, 5),
        near: direct(2, 1),
        expected: 'web · 3 dependencies, 2 direct · 5 dependents, 1 direct'
      },
      {
        title: 'it has one of each',
        name: 'web',
        all: closure(1, 1),
        near: direct(1, 1),
        expected: 'web · 1 dependency, 1 direct · 1 dependent, 1 direct'
      },
      {
        title: 'it has none of either',
        name: 'web',
        all: closure(0, 0),
        near: direct(0, 0),
        expected: 'web · 0 dependencies, 0 direct · 0 dependents, 0 direct'
      },
      {
        title: 'it has two of each',
        name: 'web',
        all: closure(2, 2),
        near: direct(2, 2),
        expected: 'web · 2 dependencies, 2 direct · 2 dependents, 2 direct'
      },
      {
        title: 'it is named __proto__',
        name: '__proto__',
        all: closure(1, 0),
        near: direct(1, 0),
        expected: '__proto__ · 1 dependency, 1 direct · 0 dependents, 0 direct'
      }
    ])('WHEN $title THEN the text is exact', ({ name, all, near, expected }) => {
      const text = selectionText(name, all, near);

      expect(text).toBe(expected);
    });
  });
});
