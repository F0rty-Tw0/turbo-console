import type { EdgeSingular, NodeSingular } from 'cytoscape';

import { packageEdges, packageNodes } from './graph-boxes.ts';
import { probeFolderLinksOf, probeFoldersOf } from './graph-probe-folders.ts';
import { probeStateOf } from './graph-probe-state.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphView } from '../common/graph-page.type.ts';
import type {
  GraphProbe,
  ProbeEdge,
  ProbeFacts,
  ProbeFolder,
  ProbeFolderLink,
  ProbeHost,
  ProbeNode
} from '../common/graph-probe.type.ts';
import { BOX_COLLAPSED_CLASS, GHOST_CLASS } from '../common/graph.const.ts';

/** A resolved style value as text; Cytoscape types `style(name)` as `any`. */
const styleText = (element: NodeSingular | EdgeSingular, name: string): string => {
  const value: unknown = element.style(name);

  return typeof value === 'string' ? value : '';
};

/** A resolved numeric style value; Cytoscape types `numericStyle(name)` as `any`. */
const styleNumber = (node: NodeSingular, name: string): number => {
  const value: unknown = node.numericStyle(name);

  return typeof value === 'number' ? value : 0;
};

const idOf = (node: NodeSingular): string => node.id();

/** The filter sense: the package's own `display` is `element` and it is no ghost; a collapsed folder's box hides it, not this. */
const isFilterVisible = (node: NodeSingular): boolean => {
  const isShown = styleText(node, 'display') === 'element';

  return isShown && !node.hasClass(GHOST_CLASS);
};

const probeEdgeOf = (edge: EdgeSingular): ProbeEdge => {
  const source = edge.source().id();
  const target = edge.target().id();
  const probeEdge: ProbeEdge = {
    source,
    target,
    state: probeStateOf(edge),
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
  const isCollapsed = node.parent().is(`.${BOX_COLLAPSED_CLASS}`);
  const probeNode: ProbeNode = {
    id: node.id(),
    x,
    y,
    renderedX,
    renderedY,
    width: node.width(),
    height: node.height(),
    state: probeStateOf(node),
    frame,
    label,
    text: styleText(node, 'label'),
    fill,
    isGhost: node.hasClass(GHOST_CLASS),
    borderStyle: styleText(node, 'border-style'),
    effectiveOpacity: node.effectiveOpacity(),
    isVisible: isFilterVisible(node),
    isCollapsed,
    outlineWidth: styleNumber(node, 'outline-width'),
    outlineColor: styleText(node, 'outline-color')
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

    return packageNodes(view.cy()).map(withOrigin);
  };
  const edges = (): ProbeEdge[] => packageEdges(view.cy()).map(probeEdgeOf);
  const visibleIds = (): string[] => {
    const ids = packageNodes(view.cy()).filter(isFilterVisible).map(idOf);

    return ids.sort();
  };
  const folders = (): ProbeFolder[] => probeFoldersOf(view.cy(), originOf());
  const folderLinks = (): ProbeFolderLink[] => probeFolderLinksOf(view.cy());
  const edgeColor = (): string => {
    const first = packageEdges(view.cy()).first();
    const isNone = first.empty();

    if (isNone) return '';

    return styleText(first, 'line-color');
  };
  const zoom = (): number => view.viewport().zoom;
  const pan = (): Position => view.viewport().pan;
  let renders = 0;

  view.cy().on('render', (): void => {
    renders += 1;
  });

  const renderCount = (): number => renders;
  const probe: GraphProbe = { ...facts, nodes, edges, visibleIds, folders, folderLinks, edgeColor, zoom, pan, renderCount };

  return probe;
};

/** Assigns the probe only when the page was opened with `__tcGraphProbeWanted === true`. */
export const exposeProbe = (host: ProbeHost, probe: GraphProbe): void => {
  // eslint-disable-next-line no-underscore-dangle -- the e2e init script sets this exact name on window
  if (host.__tcGraphProbeWanted !== true) return;

  // eslint-disable-next-line no-underscore-dangle -- the e2e tests read this exact name from window
  host.__tcGraphProbe = probe;
};
