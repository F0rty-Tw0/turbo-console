import type { GraphEdge } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { graphHashOf } from './graph-state.util.ts';
import { graphPackageOf } from '../test/utils/graph-model.spec.util.ts';

const EDGE_A: GraphEdge = { source: 'a', target: 'b' };
const EDGE_B: GraphEdge = { source: 'b', target: 'a' };
const ARROW_NAMED: GraphEdge = { source: 'a>b', target: 'c' };
const ARROW_SPLIT: GraphEdge = { source: 'a', target: 'b>c' };

describe('FEATURE: graph hash', () => {
  describe('GIVEN packages whose task counts differ', () => {
    it('WHEN hashed THEN the hash is the same', () => {
      const few = graphHashOf([graphPackageOf('a', 'x', [], 1)], []);
      const many = graphHashOf([graphPackageOf('a', 'x', [], 40)], []);

      expect(few).toBe(many);
    });
  });

  describe.each([
    [[], [], '1680411b'],
    [[graphPackageOf('a', 'packages/a'), graphPackageOf('b', 'packages/b')], [{ source: 'a', target: 'b' }], '36bdd734'],
    [[graphPackageOf('é', '')], [], 'b38d7f57'],
    [[graphPackageOf('p3', 'packages/p3', ['t'])], [], 'bbb4f037'],
    [[graphPackageOf('a', 'x'), graphPackageOf('b', 'y', ['t'])], [], '33b494ed'],
    [[graphPackageOf('__proto__', '', ['constructor'])], [], '7169b5ab']
  ])('GIVEN packages %j and edges %j', (packages, edges, expected) => {
    it(`WHEN hashed THEN it is ${expected} (FNV-1a over UTF-8)`, () => {
      expect(graphHashOf(packages, edges)).toBe(expected);
    });
  });

  it('WHEN the same graph is listed in another order THEN the hash is the same', () => {
    const shuffled = graphHashOf([graphPackageOf('b', 'y'), graphPackageOf('a', 'x')], [EDGE_B, EDGE_A]);

    expect(shuffled).toBe(graphHashOf([graphPackageOf('a', 'x'), graphPackageOf('b', 'y')], [EDGE_A, EDGE_B]));
  });

  it('WHEN an edge is added THEN the hash changes', () => {
    const packages = [graphPackageOf('a', 'x'), graphPackageOf('b', 'y')];

    expect(graphHashOf(packages, [EDGE_A])).not.toBe(graphHashOf(packages, [EDGE_A, EDGE_B]));
  });

  it('WHEN a path changes THEN the hash changes', () => {
    const base = graphHashOf([graphPackageOf('a', 'x'), graphPackageOf('b', 'y', ['t'])], []);

    const changed = graphHashOf([graphPackageOf('a', 'x2'), graphPackageOf('b', 'y', ['t'])], []);

    expect(changed).not.toBe(base);
  });

  it('WHEN a tag changes THEN the hash changes', () => {
    const base = graphHashOf([graphPackageOf('a', 'x'), graphPackageOf('b', 'y', ['t'])], []);

    const changed = graphHashOf([graphPackageOf('a', 'x'), graphPackageOf('b', 'y', ['u'])], []);

    expect(changed).not.toBe(base);
  });

  describe('GIVEN edges whose names contain >', () => {
    it('WHEN hashed THEN the two ways to split a>b>c differ', () => {
      const names = ['a', 'a>b', 'b', 'b>c', 'c'];
      const packages = names.map((name) => graphPackageOf(name, ''));

      const named = graphHashOf(packages, [ARROW_NAMED]);
      const split = graphHashOf(packages, [ARROW_SPLIT]);

      expect(named).not.toBe(split);
    });
  });
});
