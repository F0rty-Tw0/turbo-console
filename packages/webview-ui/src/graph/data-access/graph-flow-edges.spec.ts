import cytoscape from 'cytoscape';
import type { Core, EdgeSingular } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { flowEdgesOf } from './graph-flow-edges.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import type { GraphTask, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { FlowEdgeGeometry, FlowEdgeReader, FlowEdgeSource } from '../common/flow.type.ts';
import type { NodeSize } from '../common/node-size.type.ts';
import type { TaskCanvas, TaskDrawing } from '../common/task-canvas.type.ts';
import { canvasEdgeOf, canvasNodeOf } from '../test/utils/canvas-elements.spec.util.ts';
import { taskOf } from '../test/utils/shown-set.spec.util.ts';

const SOURCE: Position = { x: 1, y: 2 };

const TARGET: Position = { x: 30, y: 40 };

const BEND: Position = { x: 15, y: 5 };

const API_AT: Position = { x: 10, y: 20 };

const WEB_AT: Position = { x: 10, y: 120 };

const TASKS: GraphTask[] = [taskOf('api#build', []), taskOf('web#build', ['api#build'])];

const POSITIONS: Positions = { 'api#build': API_AT, 'web#build': WEB_AT };

const NODE_SIZE: NodeSize = { width: 80, height: 32 };

const DRAWING: TaskDrawing = {
  tasks: TASKS,
  positions: POSITIONS,
  sizeOf: (): NodeSize => NODE_SIZE,
  sizes: new Map(),
  labels: new Map()
};

/** A headless core draws no edge, so each edge's ends are its nodes' centres. */
const centredEdgeOf = (edge: EdgeSingular): FlowEdgeSource => {
  const centred: FlowEdgeSource = {
    sourceEndpoint: (): Position => edge.source().position(),
    targetEndpoint: (): Position => edge.target().position(),
    controlPoints: (): undefined => undefined
  };

  return centred;
};

/** The real core's selector matching over centred edges. */
const readerOf = (cy: Core): FlowEdgeReader => {
  const edges = (selector: string): FlowEdgeSource[] => cy.edges(selector).map(centredEdgeOf);
  const reader: FlowEdgeReader = { edges };

  return reader;
};

/** An edge as Cytoscape answers it; any part left out answers `undefined`. */
const edgeOf = (source?: Position, target?: Position, controlPoints?: Position[]): FlowEdgeSource => {
  const edge: FlowEdgeSource = {
    sourceEndpoint: (): Position | undefined => source,
    targetEndpoint: (): Position | undefined => target,
    controlPoints: (): Position[] | undefined => controlPoints
  };

  return edge;
};

/** A core whose `.task-link.highlighted` selector matches `lit` and every other selector `others`; `asked` records each selector. */
const coreOf = (lit: FlowEdgeSource[], others: FlowEdgeSource[], asked: string[]): FlowEdgeReader => {
  const edges = (selector: string): FlowEdgeSource[] => {
    asked.push(selector);

    return selector === '.task-link.highlighted' ? lit : others;
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

  it('GIVEN highlighted and other edges WHEN read THEN only the .task-link.highlighted selector is asked for', () => {
    const asked: string[] = [];
    const cy = coreOf([], [edgeOf(SOURCE, TARGET)], asked);

    const edges = flowEdgesOf(cy);

    expect(edges).toStrictEqual([]);
    expect(asked).toStrictEqual(['.task-link.highlighted']);
  });

  describe('GIVEN a real core with the package edge web -> ui highlighted', () => {
    let cy: Core;
    let tasks: TaskCanvas;

    beforeEach(() => {
      const layout = { name: 'preset', fit: false };
      const elements = [canvasNodeOf('web'), canvasNodeOf('ui'), canvasEdgeOf('web', 'ui')];

      cy = cytoscape({ headless: true, layout, elements });
      cy.edges().addClass('highlighted');
      tasks = createTaskCanvas(cy);
    });

    afterEach(() => {
      cy.destroy();
    });

    it('WHEN web#build is painted before the task graph is drawn THEN no edge is read', () => {
      tasks.paint('web#build');

      const edges = flowEdgesOf(readerOf(cy));

      expect(edges).toStrictEqual([]);
    });

    it('WHEN the task graph is drawn with web#build painted THEN only its link to api#build is read', () => {
      const expected: FlowEdgeGeometry = { source: WEB_AT, target: API_AT, controlPoints: [] };

      tasks.paint('web#build');
      tasks.show(DRAWING);

      const edges = flowEdgesOf(readerOf(cy));

      expect(edges).toStrictEqual([expected]);
    });
  });
});
