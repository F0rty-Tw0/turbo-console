import { describe, expect, it } from 'vitest';

import { flowEdgesOf } from './graph-flow-edges.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { FlowEdgeGeometry, FlowEdgeReader, FlowEdgeSource } from '../common/flow.type.ts';

const SOURCE: Position = { x: 1, y: 2 };

const TARGET: Position = { x: 30, y: 40 };

const BEND: Position = { x: 15, y: 5 };

/** An edge as Cytoscape answers it; any part left out answers `undefined`. */
const edgeOf = (source?: Position, target?: Position, controlPoints?: Position[]): FlowEdgeSource => {
  const edge: FlowEdgeSource = {
    sourceEndpoint: (): Position | undefined => source,
    targetEndpoint: (): Position | undefined => target,
    controlPoints: (): Position[] | undefined => controlPoints
  };

  return edge;
};

/** A core whose `.highlighted` selector matches `lit` and every other selector `others`; `asked` records each selector. */
const coreOf = (lit: FlowEdgeSource[], others: FlowEdgeSource[], asked: string[]): FlowEdgeReader => {
  const edges = (selector: string): FlowEdgeSource[] => {
    asked.push(selector);

    return selector === '.highlighted' ? lit : others;
  };
  const core: FlowEdgeReader = { edges };

  return core;
};

describe('FEATURE: flowEdgesOf', () => {
  it('GIVEN a highlighted curved edge WHEN read THEN it keeps its endpoints and control point', () => {
    const cy = coreOf([edgeOf(SOURCE, TARGET, [BEND])], [], []);
    const expected: FlowEdgeGeometry = { source: SOURCE, target: TARGET, controlPoints: [BEND] };

    const edges = flowEdgesOf(cy);

    expect(edges).toStrictEqual([expected]);
  });

  it('GIVEN a highlighted edge whose controlPoints() is undefined WHEN read THEN it has no control points', () => {
    const cy = coreOf([edgeOf(SOURCE, TARGET)], [], []);
    const expected: FlowEdgeGeometry = { source: SOURCE, target: TARGET, controlPoints: [] };

    const edges = flowEdgesOf(cy);

    expect(edges).toStrictEqual([expected]);
  });

  it.each([
    ['sourceEndpoint()', edgeOf(undefined, TARGET)],
    ['targetEndpoint()', edgeOf(SOURCE, undefined)]
  ])('GIVEN a highlighted edge whose %s is undefined WHEN read THEN it is skipped', (_part, unplaced) => {
    const cy = coreOf([unplaced, edgeOf(SOURCE, TARGET)], [], []);

    const edges = flowEdgesOf(cy);

    expect(edges).toHaveLength(1);
  });

  it('GIVEN highlighted and other edges WHEN read THEN only the .highlighted selector is asked for', () => {
    const asked: string[] = [];
    const cy = coreOf([], [edgeOf(SOURCE, TARGET)], asked);

    const edges = flowEdgesOf(cy);

    expect(edges).toStrictEqual([]);
    expect(asked).toStrictEqual(['.highlighted']);
  });
});
