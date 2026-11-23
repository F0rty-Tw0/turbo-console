import type { ElkEdge } from 'elkjs/lib/elk-api.js';
import { beforeEach, describe, expect, it } from 'vitest';

import { fallbackLinksOf } from './fallback-links.util.ts';
import type { FallbackLinks } from '../common/fallback-links.type.ts';
import { edgeOf, fallbackGraphOf } from '../test/utils/fallback-graph.spec.util.ts';

const SOURCELESS: ElkEdge = { id: '>a', sources: [], targets: ['a'] };

describe('FEATURE: fallbackLinksOf', () => {
  describe('GIVEN an edge to a missing child, a > missing', () => {
    it('WHEN linked THEN the edge is left out', () => {
      const graph = fallbackGraphOf(['a'], [edgeOf('a', 'missing')]);

      const links = fallbackLinksOf(graph);

      expect(links.targets).toStrictEqual([[]]);
    });
  });

  describe('GIVEN an edge with no source, > a', () => {
    let links: FallbackLinks;

    beforeEach(() => {
      links = fallbackLinksOf(fallbackGraphOf(['a'], [SOURCELESS]));
    });

    it('WHEN linked THEN the edge is left out', () => {
      expect(links.targets).toStrictEqual([[]]);
    });

    it('WHEN linked THEN a keeps indegree 0', () => {
      expect([...links.indegree]).toStrictEqual([0]);
    });
  });

  describe('GIVEN a self-loop a > a', () => {
    let links: FallbackLinks;

    beforeEach(() => {
      links = fallbackLinksOf(fallbackGraphOf(['a'], [edgeOf('a', 'a')]));
    });

    it('WHEN linked THEN a has no target', () => {
      expect(links.targets).toStrictEqual([[]]);
    });

    it('WHEN linked THEN a keeps indegree 0', () => {
      expect([...links.indegree]).toStrictEqual([0]);
    });
  });

  describe('GIVEN a repeated pair a > b twice', () => {
    let links: FallbackLinks;

    beforeEach(() => {
      links = fallbackLinksOf(fallbackGraphOf(['a', 'b'], [edgeOf('a', 'b'), edgeOf('a', 'b')]));
    });

    it('WHEN linked THEN b is a target once', () => {
      expect(links.targets).toStrictEqual([[1], []]);
    });

    it('WHEN linked THEN b has indegree 1', () => {
      expect([...links.indegree]).toStrictEqual([0, 1]);
    });
  });

  describe('GIVEN a pair both ways, a > b and b > a', () => {
    it('WHEN linked THEN each is the other one neighbour once', () => {
      const graph = fallbackGraphOf(['a', 'b'], [edgeOf('a', 'b'), edgeOf('b', 'a')]);

      const links = fallbackLinksOf(graph);

      expect(links.neighbours).toStrictEqual([[1], [0]]);
    });
  });

  describe('GIVEN neighbours of a given as c > a, a > b', () => {
    it('WHEN linked THEN a lists them in edge order', () => {
      const graph = fallbackGraphOf(['a', 'b', 'c'], [edgeOf('c', 'a'), edgeOf('a', 'b')]);

      const links = fallbackLinksOf(graph);

      expect(links.neighbours[0]).toStrictEqual([2, 1]);
    });
  });

  describe('GIVEN a child name used twice, a b a, with b > a', () => {
    it('WHEN linked THEN the edge reaches the last a', () => {
      const graph = fallbackGraphOf(['a', 'b', 'a'], [edgeOf('b', 'a')]);

      const links = fallbackLinksOf(graph);

      expect(links.targets).toStrictEqual([[], [2], []]);
    });
  });
});
