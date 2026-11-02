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

const LADDER_LAYERS = 12;

const LADDER_GETS_PER_LAYER = 6;

const ROWS: Row[] = [
  ['no dependencies', [[], {}, []], []],
  ['a plain id, no phantom', [['b#x'], {}, ['b#x']], ['b#x']],
  ['one level: p → b#build', [['p'], { p: ['b#build'] }, ['b#build']], ['b#build']],
  ['chain of two: p1 → p2 → b#build', [['p1'], { p1: ['p2'], p2: ['b#build'] }, ['b#build']], ['b#build']],
  ['cycle p1 ↔ p2 terminates', [['p1'], { p1: ['p2', 'b#x'], p2: ['p1'] }, ['b#x']], ['b#x']],
  ['dedupe: direct and through p', [['b#build', 'p'], { p: ['b#build'] }, ['b#build']], ['b#build']],
  ['hidden dependency of a phantom is cut', [['p'], { p: ['defs#gen', 'b#x'] }, ['b#x']], ['b#x']],
  ['sorted', [['p', 'a#z'], { p: ['a#b'] }, ['a#b', 'a#z']], ['a#b', 'a#z']],
  ['no phantom, an invisible id and unsorted input', [['defs#gen', 'b#x', 'a#a'], {}, ['b#x', 'a#a']], ['a#a', 'b#x']],
  [
    'a cycle under a phantom that is not in it',
    [['top'], { top: ['c1', 'a#a'], c1: ['c2', 'b#x'], c2: ['c1'] }, ['a#a', 'b#x']],
    ['a#a', 'b#x']
  ],
  ['two cycles sharing a phantom', [['x'], { s: ['x', 'y'], x: ['s', 'a#a'], y: ['s', 'b#x'] }, ['a#a', 'b#x']], ['a#a', 'b#x']],
  ['a diamond: top → l, r → m', [['top'], { top: ['l', 'r'], l: ['m'], r: ['m'], m: ['b#x'] }, ['b#x']], ['b#x']]
];

type LadderRun = {
  readonly found: string[];
  readonly gets: number;
};

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

/** `h → l0a, l0b`; each layer → both phantoms of the next; the last layer → `h` (a cycle) and `b#x`. */
const ladderPhantoms = (): Map<string, string[]> => {
  const nextOf = (layer: number): string[] => {
    const isLast = layer === LADDER_LAYERS - 1;

    if (isLast) return ['h', 'b#x'];

    return [`l${layer + 1}a`, `l${layer + 1}b`];
  };
  const layerOf = (_: unknown, layer: number): [string, string[]][] => {
    const next = nextOf(layer);

    return [
      [`l${layer}a`, next],
      [`l${layer}b`, next]
    ];
  };
  const layers = Array.from({ length: LADDER_LAYERS }, layerOf).flat();

  return new Map([['h', ['l0a', 'l0b']], ...layers]);
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

  describe('GIVEN a cycle whose members are reached again from outside it, one resolver', () => {
    const phantoms = new Map([
      ['p0', ['p5', 'b#x', 'p1']],
      ['p1', ['p0', 'p4', 'p5']],
      ['p2', ['b#x', 'p3']],
      ['p3', ['p5', 'p5', 'p2']],
      ['p4', ['p3']],
      ['p5', ['p3', 'p1', 'p0']]
    ]);

    it('WHEN p4 is resolved after p1 THEN it still reaches the build through the cycle', () => {
      const resolve = dependencyResolverOf(phantoms, new Set(['b#x']));

      resolve(['p1']);

      expect(resolve(['p4'])).toStrictEqual(['b#x']);
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

  describe('GIVEN a ladder of 12 layers of two phantoms, each layer leading to both of the next and the last back to the head', () => {
    const resolveLadder = (): LadderRun => {
      const phantoms = ladderPhantoms();
      const get = vi.spyOn(phantoms, 'get');
      const resolve = dependencyResolverOf(phantoms, new Set(['b#x']));
      const found = resolve(['h']);

      const run: LadderRun = { found, gets: get.mock.calls.length };

      return run;
    };

    it('WHEN the head is resolved THEN it reaches the build at the end', () => {
      const { found } = resolveLadder();

      expect(found).toStrictEqual(['b#x']);
    });

    it('WHEN the head is resolved THEN the lookups stay linear in the layers', () => {
      const { gets } = resolveLadder();

      expect(gets).toBeLessThan(LADDER_LAYERS * LADDER_GETS_PER_LAYER);
    });
  });
});
