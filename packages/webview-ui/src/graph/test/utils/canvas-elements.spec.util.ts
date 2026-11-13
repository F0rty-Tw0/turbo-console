import type { ElementDefinition } from 'cytoscape';

import type { GraphEdge } from '../../../bridge/common/graph-state.type.ts';
import type { SelectionColors, ThemeColors } from '../../common/theme-colors.type.ts';
import { edgeIdOf } from '../../utils/edge-id.util.ts';

/** One distinct colour per run state. */
export const CANVAS_RUN_COLORS: ThemeColors['runs'] = {
  running: '#ff0',
  continuous: '#0f2',
  passed: '#0f1',
  failed: '#f01',
  stopped: '#777',
  'failed-to-start': '#f02'
};

const CANVAS_SELECTION: SelectionColors = { fill: '#00f', label: '#ff0' };

export const CANVAS_COLORS: ThemeColors = {
  background: '#111',
  label: '#eee',
  edge: '#888',
  selected: '#f00',
  highlighted: '#0f0',
  frame: '#444',
  cached: '#a0f',
  runs: CANVAS_RUN_COLORS,
  selection: CANVAS_SELECTION,
  dimmedOpacity: 0.25,
  affected: '#fa0',
  cardFill: '#123',
  cardFrame: '#456'
};

/** `CANVAS_COLORS.affected` (`#fa0`) as the `rgb(...)` text Cytoscape resolves it to. */
export const CANVAS_AFFECTED_RGB = 'rgb(255,170,0)';

/** `CANVAS_COLORS.frame` (`#444`) as the `rgb(...)` text Cytoscape resolves it to. */
export const CANVAS_FRAME_RGB = 'rgb(68,68,68)';

/** `CANVAS_COLORS.cardFill` (`#123`) as the `rgb(...)` text Cytoscape resolves it to. */
export const CANVAS_CARD_FILL_RGB = 'rgb(17,34,51)';

/** `CANVAS_COLORS.cardFrame` (`#456`) as the `rgb(...)` text Cytoscape resolves it to. */
export const CANVAS_CARD_FRAME_RGB = 'rgb(68,85,102)';

/** `CANVAS_COLORS.selected` (`#f00`) as Cytoscape resolves it. */
export const CANVAS_SELECTED_RGB = 'rgb(255,0,0)';

/** `CANVAS_COLORS.selection.fill` (`#00f`) as Cytoscape resolves it. */
export const CANVAS_SELECTION_FILL_RGB = 'rgb(0,0,255)';

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
