import type { EdgeSingular, NodeSingular } from 'cytoscape';

import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphView } from '../common/graph-page.type.ts';
import type { GraphProbe, ProbeEdge, ProbeFacts, ProbeHost, ProbeNode, ProbeState } from '../common/graph-probe.type.ts';
import { GHOST_CLASS } from '../common/graph.const.ts';

const stateOf = (element: NodeSingular | EdgeSingular): ProbeState => {
  const isSelected = element.hasClass('selected');
  const isHighlighted = element.hasClass('highlighted');
  const isDimmed = element.hasClass('dimmed');

  if (isSelected) return 'selected';

  if (isHighlighted) return 'highlighted';

  return isDimmed ? 'dimmed' : 'normal';
};

/** A resolved style value as text; Cytoscape types `style(name)` as `any`. */
const styleText = (element: NodeSingular | EdgeSingular, name: string): string => {
  const value: unknown = element.style(name);

  return typeof value === 'string' ? value : '';
};

const idOf = (node: NodeSingular): string => node.id();

const probeEdgeOf = (edge: EdgeSingular): ProbeEdge => {
  const source = edge.source().id();
  const target = edge.target().id();
  const probeEdge: ProbeEdge = {
    source,
    target,
    state: stateOf(edge),
    isGhost: edge.hasClass(GHOST_CLASS),
    isDrawn: edge.visible(),
    lineStyle: styleText(edge, 'line-style')
  };

  return probeEdge;
};

/** `node` with its centre in page CSS pixels, `origin` being the container's top left corner. */
const probeNodeOf = (node: NodeSingular, origin: Position): ProbeNode => {
  const { x, y } = node.position();
  const rendered = node.renderedPosition();
  const renderedX = origin.x + rendered.x;
  const renderedY = origin.y + rendered.y;
  const frame = styleText(node, 'border-color');
  const label = styleText(node, 'color');
  const fill = styleText(node, 'background-color');
  const probeNode: ProbeNode = {
    id: node.id(),
    x,
    y,
    renderedX,
    renderedY,
    width: node.width(),
    height: node.height(),
    state: stateOf(node),
    frame,
    label,
    fill,
    isGhost: node.hasClass(GHOST_CLASS),
    borderStyle: styleText(node, 'border-style')
  };

  return probeNode;
};

/** Reads the drawn graph from `view` and the page facts from `facts`; empty lists while nothing is drawn. */
export const createGraphProbe = (view: Pick<GraphView, 'cy' | 'viewport'>, facts: ProbeFacts): GraphProbe => {
  const originOf = (): Position => {
    const rect = view.cy().container()?.getBoundingClientRect();
    const origin: Position = { x: rect?.left ?? 0, y: rect?.top ?? 0 };

    return origin;
  };
  const nodes = (): ProbeNode[] => {
    const origin = originOf();
    const withOrigin = (node: NodeSingular): ProbeNode => probeNodeOf(node, origin);

    return view.cy().nodes().map(withOrigin);
  };
  const edges = (): ProbeEdge[] => view.cy().edges().map(probeEdgeOf);
  const visibleIds = (): string[] => {
    const ids = view.cy().nodes(':visible').not(`.${GHOST_CLASS}`).map(idOf);

    return ids.sort();
  };
  const edgeColor = (): string => {
    const first = view.cy().edges().first();
    const isNone = first.empty();

    if (isNone) return '';

    return styleText(first, 'line-color');
  };
  const zoom = (): number => view.viewport().zoom;
  const pan = (): Position => view.viewport().pan;
  const probe: GraphProbe = { ...facts, nodes, edges, visibleIds, edgeColor, zoom, pan };

  return probe;
};

/** Assigns the probe only when the page was opened with `__tcGraphProbeWanted === true`. */
export const exposeProbe = (host: ProbeHost, probe: GraphProbe): void => {
  // eslint-disable-next-line no-underscore-dangle -- the e2e init script sets this exact name on window
  if (host.__tcGraphProbeWanted !== true) return;

  // eslint-disable-next-line no-underscore-dangle -- the e2e tests read this exact name from window
  host.__tcGraphProbe = probe;
};
