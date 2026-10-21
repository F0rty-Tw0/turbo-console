import cytoscape from 'cytoscape';
import type { Core, EdgeSingular, ElementDefinition, EventObject, EventObjectNode, NodeSingular } from 'cytoscape';

import { graphStyleOf } from './graph-style.ts';
import { centreOnNode, fitVisible, showOnly } from './graph-visibility.ts';
import type { GraphEdge, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { Closure } from '../common/closure.type.ts';
import type { GraphView, GraphViewHandlers, NodeSizer, Viewport } from '../common/graph-page.type.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';
import { edgeStateOf, nodeStateOf } from '../utils/highlight.util.ts';

const FIT_PADDING_PX = 24;

/** Bounds for fit and wheel zoom, so a two-node graph is not fitted to a giant scale. */
const MIN_ZOOM = 0.05;

const MAX_ZOOM = 2;

const ORIGIN: Position = { x: 0, y: 0 };

/** Own entries only, so a package named `constructor` or `toString` never resolves to an inherited member. */
const positionOf = (positions: Positions, name: string): Position => {
  const position = Object.hasOwn(positions, name) ? positions[name] : undefined;

  return position ?? ORIGIN;
};

const nodeDefinitionsOf = (packages: string[], positions: Positions, sizeOf: NodeSizer): ElementDefinition[] => {
  const definitionOf = (name: string): ElementDefinition => {
    const { width, height } = sizeOf(name);
    const data = { id: name, width, height };
    const position = positionOf(positions, name);
    const definition: ElementDefinition = { data, position };

    return definition;
  };

  return packages.map(definitionOf);
};

const edgeDefinitionOf = (edge: GraphEdge): ElementDefinition => {
  const data = { id: edgeIdOf(edge), source: edge.source, target: edge.target };
  const definition: ElementDefinition = { data };

  return definition;
};

const centreEntryOf = (node: NodeSingular): [string, Position] => {
  const { x, y } = node.position();
  const centre: Position = { x, y };

  return [node.id(), centre];
};

const nodeName = (event: EventObjectNode): string => event.target.id();

const positionsOf = (cy: Core): Positions => {
  const entries = cy.nodes().map(centreEntryOf);

  return Object.fromEntries(entries);
};

const drawGraph = (cy: Core, nodes: ElementDefinition[], edges: GraphEdge[]): void => {
  const links = edges.map(edgeDefinitionOf);

  cy.resize();
  cy.elements().remove();
  cy.add([...nodes, ...links]);
};

const classElements = (cy: Core, selected: string | null, closure: Closure | null): void => {
  const classNode = (node: NodeSingular): void => {
    const state = nodeStateOf(node.id(), selected, closure);

    node.classes([state]);
  };
  const classEdge = (edge: EdgeSingular): void => {
    const source = edge.source().id();
    const target = edge.target().id();
    const ends: GraphEdge = { source, target };
    const state = edgeStateOf(ends, selected, closure);

    edge.classes([state]);
  };

  cy.batch((): void => {
    cy.nodes().forEach(classNode);
    cy.edges().forEach(classEdge);
  });
};

const listen = (cy: Core, handlers: GraphViewHandlers): void => {
  const onBackground = (event: EventObject): void => {
    if (event.target === cy) handlers.onTapBackground();
  };

  cy.on('tap', 'node', (event: EventObjectNode): void => handlers.onTapNode(nodeName(event)));
  cy.on('tap', onBackground);
  cy.on('dbltap', 'node', (event: EventObjectNode): void => handlers.onDoubleTapNode(nodeName(event)));
  cy.on('dragfree', 'node', (): void => handlers.onDragEnd(positionsOf(cy)));
  cy.on('viewport', handlers.onViewport);
  cy.on('render', handlers.onRender);
};

/** Cytoscape on `container` with the preset layout (positions are node centres) and the canvas renderer. */
export const createGraphView = (container: HTMLElement, handlers: GraphViewHandlers, fontFamily: string): GraphView => {
  const layout = { name: 'preset' };
  const renderer = { name: 'canvas' };
  const options = {
    container,
    layout,
    renderer,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    autounselectify: true,
    boxSelectionEnabled: false
  };
  const cy = cytoscape(options);
  const setGraph = (packages: string[], edges: GraphEdge[], placed: Positions, sizeOf: NodeSizer): void => {
    const nodes = nodeDefinitionsOf(packages, placed, sizeOf);

    drawGraph(cy, nodes, edges);
  };
  const fit = (): void => {
    cy.resize();
    fitVisible(cy, FIT_PADDING_PX);
  };
  const viewport = (): Viewport => {
    const current: Viewport = { zoom: cy.zoom(), pan: cy.pan() };

    return current;
  };
  const setViewport = (zoom: number, pan: Position): void => {
    cy.resize();
    cy.viewport({ zoom, pan });
  };
  const setPositions = (placed: Positions): void => {
    const placeNode = (node: NodeSingular): Position => positionOf(placed, node.id());

    cy.nodes().positions(placeNode);
  };
  const view: GraphView = {
    setGraph,
    select: (selected, closure): void => classElements(cy, selected, closure),
    fit,
    setVisible: (visible: ReadonlySet<string>): void => showOnly(cy, visible),
    resize: (): void => void cy.resize(),
    centreOn: (name: string): void => centreOnNode(cy, name),
    viewport,
    setViewport,
    setPositions,
    applyTheme: (colors: ThemeColors): void => void cy.style(graphStyleOf(colors, fontFamily)),
    cy: (): Core => cy
  };

  listen(cy, handlers);

  return view;
};
