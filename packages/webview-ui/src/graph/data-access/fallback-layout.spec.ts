import type { ElkEdge, ElkNode } from 'elkjs/lib/elk-api.js';
import { describe, expect, it } from 'vitest';

import { breadthfirstPositions } from './fallback-layout.ts';
import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import { NODE_HEIGHT } from '../common/graph.const.ts';

const childOf = (id: string): ElkNode => {
  const child: ElkNode = { id, width: 150, height: NODE_HEIGHT };

  return child;
};

const edgeOf = (source: string, target: string): ElkEdge => {
  const edge: ElkEdge = { id: `${source}>${target}`, sources: [source], targets: [target] };

  return edge;
};

const graphOf = (names: string[], edges: ElkEdge[]): ElkNode => {
  const children = names.map(childOf);
  const graph: ElkNode = { id: 'root', children, edges };

  return graph;
};

const positionIn = (positions: Positions, name: string): Position => {
  const position = Object.hasOwn(positions, name) ? positions[name] : undefined;

  if (position === undefined) throw new Error(`no position for ${name}`);

  return position;
};

describe('FEATURE: breadthfirstPositions', () => {
  describe('GIVEN a chain a > b > c', () => {
    const chain = graphOf(['a', 'b', 'c'], [edgeOf('a', 'b'), edgeOf('b', 'c')]);

    it('WHEN laid out THEN every package gets finite numbers', () => {
      const positions = breadthfirstPositions(chain);

      const numbers = Object.values(positions).flatMap((position: Position): number[] => [position.x, position.y]);

      expect(Object.keys(positions)).toStrictEqual(['a', 'b', 'c']);
      expect(numbers.every(Number.isFinite)).toBe(true);
    });

    it('WHEN laid out THEN dependents sit above their dependencies', () => {
      const positions = breadthfirstPositions(chain);

      const a = positionIn(positions, 'a').y;
      const b = positionIn(positions, 'b').y;
      const c = positionIn(positions, 'c').y;

      expect(a).toBeLessThan(b);
      expect(b).toBeLessThan(c);
    });

    it('WHEN laid out THEN rows are further apart than a node is tall', () => {
      const positions = breadthfirstPositions(chain);

      const gap = positionIn(positions, 'b').y - positionIn(positions, 'a').y;

      expect(gap).toBeGreaterThan(NODE_HEIGHT);
    });
  });

  describe('GIVEN two roots a > c and b > c', () => {
    const twoRoots = graphOf(['a', 'b', 'c'], [edgeOf('a', 'c'), edgeOf('b', 'c')]);

    it('WHEN laid out THEN c sits below both', () => {
      const positions = breadthfirstPositions(twoRoots);

      const c = positionIn(positions, 'c').y;

      expect(positionIn(positions, 'a').y).toBeLessThan(c);
      expect(positionIn(positions, 'b').y).toBeLessThan(c);
    });

    it('WHEN laid out THEN the two roots are further apart than a node is wide', () => {
      const positions = breadthfirstPositions(twoRoots);

      const gap = Math.abs(positionIn(positions, 'b').x - positionIn(positions, 'a').x);

      expect(gap).toBeGreaterThan(150);
    });
  });

  describe('GIVEN packages named like Object.prototype members, app > constructor > toString', () => {
    const prototypeNames = graphOf(
      ['app', 'constructor', 'toString'],
      [edgeOf('app', 'constructor'), edgeOf('constructor', 'toString')]
    );

    it('WHEN laid out THEN each package gets its own entry', () => {
      const positions = breadthfirstPositions(prototypeNames);

      const ownNames = Object.keys(positions);

      expect(ownNames).toStrictEqual(['app', 'constructor', 'toString']);
    });

    it('WHEN laid out THEN dependents still sit above their dependencies', () => {
      const positions = breadthfirstPositions(prototypeNames);

      const app = positionIn(positions, 'app').y;
      const constructorY = positionIn(positions, 'constructor').y;
      const toStringY = positionIn(positions, 'toString').y;

      expect(app).toBeLessThan(constructorY);
      expect(constructorY).toBeLessThan(toStringY);
    });
  });

  describe('GIVEN one package with five dependencies', () => {
    const names = ['dep0', 'dep1', 'dep2', 'dep3', 'dep4'];
    const fan = graphOf(['app', ...names], names.map((name): ElkEdge => edgeOf('app', name)));

    it('WHEN laid out THEN the dependencies share one row', () => {
      const positions = breadthfirstPositions(fan);

      const rows = new Set(names.map((name): number => positionIn(positions, name).y));

      expect(rows.size).toBe(1);
    });
  });

  describe('GIVEN one package with four hundred dependencies, more than the column floor squares to', () => {
    const names = Array.from({ length: 400 }, (_, index): string => `dep${index}`);
    const fanOut = graphOf(['app', ...names], names.map((name): ElkEdge => edgeOf('app', name)));
    const extentOf = (values: number[]): number => Math.max(...values) - Math.min(...values);

    describe('WHEN laid out', () => {
      it('THEN the graph is no more than twice as wide as it is tall', () => {
        const positions = Object.values(breadthfirstPositions(fanOut));

        const width = extentOf(positions.map((position): number => position.x));
        const height = extentOf(positions.map((position): number => position.y));

        expect(width).toBeLessThanOrEqual(height * 2);
      });

      it('THEN every dependency still sits below the package', () => {
        const positions = breadthfirstPositions(fanOut);

        const app = positionIn(positions, 'app').y;
        const dependencies = names.map((name): number => positionIn(positions, name).y);

        expect(Math.min(...dependencies)).toBeGreaterThan(app);
      });

      it('THEN no two packages share a position', () => {
        const positions = Object.values(breadthfirstPositions(fanOut));

        const spots = new Set(positions.map((position): string => `${position.x},${position.y}`));

        expect(spots.size).toBe(401);
      });
    });
  });

  describe('GIVEN no children', () => {
    it('WHEN laid out THEN there are no positions', () => {
      const positions = breadthfirstPositions({ id: 'root' });

      expect(positions).toStrictEqual({});
    });
  });
});
