import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';

import { setBoxes } from './graph-boxes.ts';
import { anchorBoxOf, panBy } from './graph-camera.ts';
import { exportPngOf } from './graph-export.ts';
import { flowEdgesOf } from './graph-flow-edges.ts';
import { createFoldersView } from './graph-folders-view.ts';
import { setGhosts } from './graph-ghosts.ts';
import { listen } from './graph-listen.ts';
import { applyPaint } from './graph-paint.ts';
import { placeNodes, positionOf } from './graph-place.ts';
import { widgetRectsOf } from './graph-rects.ts';
import { graphStyleOf } from './graph-style.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import { centreOnNode, fitVisible, showOnly } from './graph-visibility.ts';
import type { GraphEdge, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { FlowEdgeGeometry } from '../common/flow.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { GhostMarks } from '../common/ghost.type.ts';
import type { GraphView, GraphViewHandlers, NodeSizer, Viewport } from '../common/graph-page.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import type { Paint } from '../common/paint.type.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import type { WidgetRects } from '../common/widget.type.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

const FIT_PADDING_PX = 24;

/** Bounds for fit and wheel zoom, so a two-node graph is not fitted to a giant scale. */
const MIN_ZOOM = 0.05;

const MAX_ZOOM = 2;

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

const drawGraph = (cy: Core, nodes: ElementDefinition[], edges: GraphEdge[]): void => {
  const links = edges.map(edgeDefinitionOf);

  cy.resize();
  cy.elements().remove();
  cy.add([...nodes, ...links]);
};

/**
 * Cytoscape on `container` with the preset layout (positions are node centres) and the canvas renderer. Its own resize
 * is debounced 100 ms, so until then a tap after the toolbar wraps lands where the canvas was; a resize per change ends that.
 */
const cytoscapeOn = (container: HTMLElement): Core => {
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

  new ResizeObserver((): void => void cy.resize()).observe(container);

  return cy;
};

/** A copy of the camera: `cy.pan()` is Cytoscape's own object, which a later pan changes in place. */
const viewportOf = (cy: Core): Viewport => {
  const { x, y } = cy.pan();
  const pan: Position = { x, y };
  const current: Viewport = { zoom: cy.zoom(), pan };

  return current;
};

/** The page's canvas view: Cytoscape, the folder pass over it and the canvas events reported to `handlers`. */
export const createGraphView = (container: HTMLElement, handlers: GraphViewHandlers, fontFamily: string): GraphView => {
  const cy = cytoscapeOn(container);
  const folders = createFoldersView(cy);
  const tasks = createTaskCanvas(cy);
  const setGraph = (packages: string[], edges: GraphEdge[], placed: Positions, sizeOf: NodeSizer): void => {
    const nodes = nodeDefinitionsOf(packages, placed, sizeOf);

    drawGraph(cy, nodes, edges);
  };
  const fit = (): void => {
    cy.resize();
    fitVisible(cy, FIT_PADDING_PX);
  };
  const setViewport = (zoom: number, pan: Position): void => {
    cy.resize();
    cy.viewport({ zoom, pan });
  };
  const paint = (next: Paint): void => {
    applyPaint(cy, next);
    folders.paint(next);
  };
  const setPositions = (placed: Positions): void => {
    placeNodes(cy, placed);
    folders.recentre();
  };
  const view: GraphView = {
    setGraph,
    paint,
    fit,
    setVisible: (visible: ReadonlySet<string>): void => showOnly(cy, visible),
    setGhosts: (marks: GhostMarks, visible: ReadonlySet<string>): void => setGhosts(cy, marks, visible),
    resize: (): void => void cy.resize(),
    centreOn: (name: string): void => centreOnNode(cy, name),
    anchorBox: (names: string[]): AnchorBox | null => anchorBoxOf(cy, names),
    panBy: (dx: number): void => panBy(cy, dx),
    viewport: (): Viewport => viewportOf(cy),
    setViewport,
    setGrouping: (groups: FolderGroup[] | null): void => setBoxes(cy, groups),
    setPositions,
    showFolders: (scene: FolderScene | null, labelOf: (folder: string) => string): void => folders.show(scene, labelOf),
    applyTheme: (colors: ThemeColors): void => void cy.style(graphStyleOf(colors, fontFamily)),
    widgetRects: (selected: string | null): WidgetRects => widgetRectsOf(cy, selected),
    exportPng: (bg: string): string => exportPngOf(cy, bg, window.devicePixelRatio),
    flowEdges: (): FlowEdgeGeometry[] => flowEdgesOf(cy),
    cy: (): Core => cy,
    tasks
  };

  listen(cy, handlers);
  cy.on('dragfreeon', 'node', (): void => folders.recentre());

  return view;
};
