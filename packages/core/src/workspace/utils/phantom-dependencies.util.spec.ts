import { describe, expect, it, vi } from 'vitest';

import { dependencyResolverOf } from './phantom-dependencies.util.ts';

type Scenario = [raw: string[], phantoms: Record<string, string[]>, visible: string[]];

type Row = [title: string, scenario: Scenario, expected: string[]];

type ChainRun = {
  readonly dependents: string[][];
  readonly walks: string[];
};

const CHAIN_LENGTH = 50;

const DEPENDENT_COUNT = 100;

const ROWS: Row[] = [
  ['no dependencies', [[], {}, []], []],
  ['a plain id, no phantom', [['b#x'], {}, ['b#x']], ['b#x']],
  ['one level: p → b#build', [['p'], { p: ['b#build'] }, ['b#build']], ['b#build']],
  ['chain of two: p1 → p2 → b#build', [['p1'], { p1: ['p2'], p2: ['b#build'] }, ['b#build']], ['b#build']],
  ['cycle p1 ↔ p2 terminates', [['p1'], { p1: ['p2', 'b#x'], p2: ['p1'] }, ['b#x']], ['b#x']],
  ['dedupe: direct and through p', [['b#build', 'p'], { p: ['b#build'] }, ['b#build']], ['b#build']],
  ['hidden dependency of a phantom is cut', [['p'], { p: ['defs#gen', 'b#x'] }, ['b#x']], ['b#x']],
  ['sorted', [['p', 'a#z'], { p: ['a#b'] }, ['a#b', 'a#z']], ['a#b', 'a#z']]
];

const phantomName = (index: number): string => `p${index}`;

/** `p0 → p1 → … → p49 → b#build`, as a phantoms map. */
const chainPhantoms = (): Map<string, string[]> => {
  const nextOf = (index: number): string => {
    const isLast = index === CHAIN_LENGTH - 1;

    if (isLast) return 'b#build';

    return phantomName(index + 1);
  };
  const linkOf = (_: unknown, index: number): [string, string[]] => [phantomName(index), [nextOf(index)]];
  const links = Array.from({ length: CHAIN_LENGTH }, linkOf);

  return new Map(links);
};

describe('FEATURE: phantom dependencies pass through', () => {
  describe.each(ROWS)('GIVEN %s', (_title, scenario, expected) => {
    it('WHEN resolved THEN the visible, deduped, sorted ids come back', () => {
      const [raw, phantoms, visible] = scenario;
      const resolve = dependencyResolverOf(new Map(Object.entries(phantoms)), new Set(visible));

      expect(resolve(raw)).toStrictEqual(expected);
    });
  });

  describe('GIVEN a cycle p1 ↔ p2 with a way out from each side, one resolver', () => {
    const phantoms = new Map([
      ['p1', ['p2', 'b#x']],
      ['p2', ['p1', 'c#y']]
    ]);
    const visible = new Set(['b#x', 'c#y']);

    it('WHEN p2 is resolved after p1 THEN it still reaches both exits', () => {
      const resolve = dependencyResolverOf(phantoms, visible);

      resolve(['p1']);

      expect(resolve(['p2'])).toStrictEqual(['b#x', 'c#y']);
    });
  });

  describe('GIVEN a chain of 50 phantoms and 100 tasks depending on its head, one resolver', () => {
    const resolveDependents = (): ChainRun => {
      const phantoms = chainPhantoms();
      const get = vi.spyOn(phantoms, 'get');
      const resolve = dependencyResolverOf(phantoms, new Set(['b#build']));
      const dependents = Array.from({ length: DEPENDENT_COUNT }, () => resolve(['p0']));
      const walks = get.mock.calls.map(([id]) => id).filter((id) => id.startsWith('p'));

      const run: ChainRun = { dependents, walks };

      return run;
    };

    it('WHEN each is resolved THEN every one reaches the build at the end', () => {
      const { dependents } = resolveDependents();

      const wrong = dependents.filter((dependencies) => dependencies.join() !== 'b#build');

      expect(dependents).toHaveLength(DEPENDENT_COUNT);
      expect(wrong).toStrictEqual([]);
    });

    it('WHEN each is resolved THEN every phantom is walked once', () => {
      const { walks } = resolveDependents();

      expect(walks).toHaveLength(CHAIN_LENGTH);
    });
  });
});
