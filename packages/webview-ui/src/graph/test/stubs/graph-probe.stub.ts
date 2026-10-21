import type { Position } from '../../../bridge/common/graph-state.type.ts';
import type { GraphProbe } from '../../common/graph-probe.type.ts';

const ORIGIN: Position = { x: 0, y: 0 };

export const GRAPH_PROBE_STUB: GraphProbe = {
  nodes: () => [],
  edges: () => [],
  edgeColor: () => '',
  selected: () => null,
  zoom: () => 1,
  pan: () => ORIGIN,
  firstFrameMs: () => null,
  layoutEngine: () => null,
  visibleIds: () => [],
  controlsBuiltMs: () => null,
  filterAppliedMs: () => null
};
