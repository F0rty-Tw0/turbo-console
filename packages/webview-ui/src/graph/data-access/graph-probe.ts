import type { Core, EdgeSingular, NodeSingular } from 'cytoscape';

import { packageEdges, packageNodes } from './graph-boxes.ts';
import { dirtyEdgeEndIdsOf } from './graph-probe-edge-ends.ts';
import { exportLabelOf } from './graph-probe-export.ts';
import { probeFolderLinksOf, probeFoldersOf } from './graph-probe-folders.ts';
import { labelFitOf } from './graph-probe-label.ts';
import { drawWithoutLayers } from './graph-probe-layers.ts';
import { edgeLinesOf, folderLinkLinesOf } from './graph-probe-lines.ts';
import { probeStateOf, styleNumber, styleText } from './graph-probe-state.ts';
import { probeTitlesOf } from './graph-probe-titles.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { GraphView } from '../common/graph-page.type.ts';
import type { ProbeLabelFit } from '../common/graph-probe-label.type.ts';
import type { ProbeTitle } from '../common/graph-probe-titles.type.ts';
import type {
  GraphProbe,
  ProbeEdge,
  ProbeEdgeLine,
  ProbeFacts,
  ProbeFolder,
  ProbeFolderLink,
  ProbeHost,
  ProbeNode
} from '../common/graph-probe.type.ts';
import { BOX_COLLAPSED_CLASS, GHOST_CLASS } from '../common/graph.const.ts';

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
    lineStyle: styleText(edge, 'line-style'),
    curveStyle: styleText(edge, 'curve-style')
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
    textMaxWidth: styleNumber(node, 'text-max-width'),
    fill,
    isGhost: node.hasClass(GHOST_CLASS),
    borderStyle: styleText(node, 'border-style'),
    effectiveOpacity: node.effectiveOpacity(),
    isVisible: isFilterVisible(node),
    isCollapsed,
    outlineWidth: styleNumber(node, 'outline-width'),
    outlineColor: styleText(node, 'outline-color'),
    underlayColor: styleText(node, 'underlay-color'),
    underlayOpacity: styleNumber(node, 'underlay-opacity')
  };

  return probeNode;
};

/** The first package edge's `line-color`, `''` when there is no edge. */
const edgeColorOf = (cy: Core): string => {
  const first = packageEdges(cy).first();
  const isNone = first.empty();

  if (isNone) return '';

  return styleText(first, 'line-color');
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
  const edgeLines = (): ProbeEdgeLine[] => edgeLinesOf(view.cy(), originOf());
  const visibleIds = (): string[] => {
    const ids = packageNodes(view.cy()).filter(isFilterVisible).map(idOf);

    return ids.sort();
  };
  const folders = (): ProbeFolder[] => probeFoldersOf(view.cy(), originOf());
  const folderLinkLines = (): ProbeEdgeLine[] => folderLinkLinesOf(view.cy(), originOf());
  const folderLinks = (): ProbeFolderLink[] => probeFolderLinksOf(view.cy(), originOf());
  const edgeColor = (): string => edgeColorOf(view.cy());
  let renders = 0;

  view.cy().on('render', (): void => {
    renders += 1;
  });

  const probe: GraphProbe = {
    ...facts,
    nodes,
    edges,
    labelFit: (id: string): ProbeLabelFit | null => labelFitOf(view.cy(), id),
    edgeLines,
    visibleIds,
    folders,
    folderLinks,
    folderLinkLines,
    boxTitles: (): ProbeTitle[] => probeTitlesOf(view.cy(), originOf()),
    exportLabel: (id: string): string => exportLabelOf(view.cy(), id),
    edgeColor,
    zoom: (): number => view.viewport().zoom,
    pan: (): Position => view.viewport().pan,
    renderCount: (): number => renders,
    forceRender: (): void => void view.cy().forceRender(),
    drawWithoutLayers: (): void => drawWithoutLayers(view.cy()),
    dirtyEdgeEndIds: (): string[] => dirtyEdgeEndIdsOf(view.cy())
  };

  return probe;
};

/**
 * Builds and assigns the probe only when the page was opened with `__tcGraphProbeWanted === true`, so a production page
 * never registers the probe's `render` counter.
 */
export const exposeProbe = (host: ProbeHost, probeOf: () => GraphProbe): void => {
  // eslint-disable-next-line no-underscore-dangle -- the e2e init script sets this exact name on window
  if (host.__tcGraphProbeWanted !== true) return;

  const probe = probeOf();

  // eslint-disable-next-line no-underscore-dangle -- the e2e tests read this exact name from window
  host.__tcGraphProbe = probe;
};
