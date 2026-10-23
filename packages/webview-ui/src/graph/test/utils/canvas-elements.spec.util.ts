import type { ElementDefinition } from 'cytoscape';

import type { GraphEdge } from '../../../bridge/common/graph-state.type.ts';
import type { ThemeColors } from '../../common/theme-colors.type.ts';
import { edgeIdOf } from '../../utils/edge-id.util.ts';

/** One distinct colour per run state. */
export const CANVAS_RUN_COLORS: ThemeColors['runs'] = {
  running: '#ff0',
  passed: '#0f1',
  failed: '#f01',
  stopped: '#777',
  'failed-to-start': '#f02'
};

export const CANVAS_COLORS: ThemeColors = {
  background: '#111',
  label: '#eee',
  edge: '#888',
  selected: '#f00',
  highlighted: '#0f0',
  frame: '#444',
  runs: CANVAS_RUN_COLORS
};

export const canvasNodeOf = (id: string): ElementDefinition => {
  const data = { id };
  const definition: ElementDefinition = { data };

  return definition;
};

/** The edge `source` to `target`, with the id the page gives it. */
export const canvasEdgeOf = (source: string, target: string): ElementDefinition => {
  const edge: GraphEdge = { source, target };
  const data = { id: edgeIdOf(edge), source, target };
  const definition: ElementDefinition = { data };

  return definition;
};

/** Nodes a, b, c and `__proto__`; edges a to b and b to c. */
export const CANVAS_ELEMENTS: ElementDefinition[] = [
  canvasNodeOf('a'),
  canvasNodeOf('b'),
  canvasNodeOf('c'),
  canvasNodeOf('__proto__'),
  canvasEdgeOf('a', 'b'),
  canvasEdgeOf('b', 'c')
];
