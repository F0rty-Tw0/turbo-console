import { describe, expect, it } from 'vitest';

import { dependenciesThroughOf } from './phantom-dependencies.util.ts';

type Scenario = [raw: string[], phantoms: Record<string, string[]>, visible: string[]];

type Row = [title: string, scenario: Scenario, expected: string[]];

const ROWS: Row[] = [
  ['a plain id, no phantom', [['b#x'], {}, ['b#x']], ['b#x']],
  ['one level: p → b#build', [['p'], { p: ['b#build'] }, ['b#build']], ['b#build']],
  ['chain of two: p1 → p2 → b#build', [['p1'], { p1: ['p2'], p2: ['b#build'] }, ['b#build']], ['b#build']],
  ['cycle p1 ↔ p2 terminates', [['p1'], { p1: ['p2', 'b#x'], p2: ['p1'] }, ['b#x']], ['b#x']],
  ['dedupe: direct and through p', [['b#build', 'p'], { p: ['b#build'] }, ['b#build']], ['b#build']],
  ['hidden dependency of a phantom is cut', [['p'], { p: ['defs#gen', 'b#x'] }, ['b#x']], ['b#x']],
  ['sorted', [['p', 'a#z'], { p: ['a#b'] }, ['a#b', 'a#z']], ['a#b', 'a#z']]
];

describe('FEATURE: phantom dependencies pass through', () => {
  describe.each(ROWS)('GIVEN %s', (_title, scenario, expected) => {
    it('WHEN resolved THEN the visible, deduped, sorted ids come back', () => {
      const [raw, phantoms, visible] = scenario;

      const dependencies = dependenciesThroughOf(raw, new Map(Object.entries(phantoms)), new Set(visible));

      expect(dependencies).toStrictEqual(expected);
    });
  });
});
