import type { Position } from '../../../bridge/common/graph-state.type.ts';
import type { GraphProbe } from '../../common/graph-probe.type.ts';
import { NO_INSPECTION } from '../../common/inspection.const.ts';

const ORIGIN: Position = { x: 0, y: 0 };

export const GRAPH_PROBE_STUB: GraphProbe = {
  nodes: () => [],
  edges: () => [],
  edgeColor: () => '',
  selected: () => null,
  zoom: () => 1,
  pan: () => ORIGIN,
  renderCount: () => 0,
  firstFrameMs: () => null,
  layoutEngine: () => null,
  visibleIds: () => [],
  grouped: () => false,
  folders: () => [],
  folderLinks: () => [],
  toggleMs: () => null,
  atomToggleMs: () => null,
  controlsBuiltMs: () => null,
  filterAppliedMs: () => null,
  inspection: () => NO_INSPECTION,
  detailsBuiltMs: () => null,
  pickingBuiltMs: () => null,
  traceMs: () => null
};
