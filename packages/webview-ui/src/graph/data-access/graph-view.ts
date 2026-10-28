import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';

import { createAtomCanvas } from './graph-atom-view.ts';
import { setBoxes } from './graph-boxes.ts';
import { anchorBoxOf, panBy } from './graph-camera.ts';
import { exportPngOf } from './graph-export.ts';
import { createFittedCamera } from './graph-fitted.ts';
import { flowEdgesOf } from './graph-flow-edges.ts';
import { createFoldersView } from './graph-folders-view.ts';
import { setGhosts } from './graph-ghosts.ts';
import { listen } from './graph-listen.ts';
import { applyFocusTarget, applyPaint } from './graph-paint.ts';
import { placeNodes, positionOf } from './graph-place.ts';
import { markRowLess, widgetRectsOf } from './graph-rects.ts';
import { graphStyleOf } from './graph-style.ts';
import { createTaskCanvas } from './graph-task-view.ts';
import { showOnly } from './graph-visibility.ts';
import type { GraphEdge, Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { FlowEdgeGeometry } from '../common/flow.type.ts';
import type { FolderGroup } from '../common/folder-group.type.ts';
import type { FolderScene } from '../common/folder-scene.type.ts';
import type { GhostMarks } from '../common/ghost.type.ts';
import type { FoldersView, GraphView, GraphViewHandlers, NodeSizer, Viewport } from '../common/graph-page.type.ts';
import type { AnchorBox } from '../common/keep-clear.type.ts';
import type { Paint } from '../common/paint.type.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import type { RowPlan, WidgetRects } from '../common/widget.type.ts';
import { edgeIdOf } from '../utils/edge-id.util.ts';

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
 * is debounced 100 ms, so until then a tap after the toolbar wraps lands where the canvas was; the camera's container
 * observer resizes per change and ends that.
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

  return cytoscape(options);
};

/** A copy of the camera: `cy.pan()` is Cytoscape's own object, which a later pan changes in place. */
const viewportOf = (cy: Core): Viewport => {
  const { x, y } = cy.pan();
  const pan: Position = { x, y };
  const current: Viewport = { zoom: cy.zoom(), pan };

  return current;
};

/** Places the packages, then re-centres the collapsed folders on them. */
const placeOn = (cy: Core, folders: FoldersView, placed: Positions): void => {
  placeNodes(cy, placed);
  folders.recentre();
};

/** The page's canvas view: Cytoscape, the folder pass over it and the canvas events reported to `handlers`. */
export const createGraphView = (
  container: HTMLElement,
  handlers: GraphViewHandlers,
  fontFamily: string,
  glyphs: boolean
): GraphView => {
  const cy = cytoscapeOn(container);
  const camera = createFittedCamera(cy, handlers);
  const folders = createFoldersView(cy);
  const tasks = createTaskCanvas(cy);
  const atoms = createAtomCanvas(cy);
  const setGraph = (packages: string[], edges: GraphEdge[], placed: Positions, sizeOf: NodeSizer): void => {
    const nodes = nodeDefinitionsOf(packages, placed, sizeOf);

    drawGraph(cy, nodes, edges);
  };
  const paint = (next: Paint): void => {
    applyPaint(cy, next);
    folders.paint(next);
  };
  const view: GraphView = {
    setGraph,
    paint,
    fit: camera.fit,
    isFitted: camera.isFitted,
    setVisible: (visible: ReadonlySet<string>): void => showOnly(cy, visible),
    setFocusTarget: (name: string | null): void => applyFocusTarget(cy, name),
    setGhosts: (marks: GhostMarks, visible: ReadonlySet<string>): void => setGhosts(cy, marks, visible),
    resize: (): void => void cy.resize(),
    centreOn: camera.centreOn,
    anchorBox: (names: string[]): AnchorBox | null => anchorBoxOf(cy, names),
    panBy: (dx: number): void => panBy(cy, dx),
    viewport: (): Viewport => viewportOf(cy),
    setViewport: camera.setViewport,
    setGrouping: (groups: FolderGroup[] | null): void => setBoxes(cy, groups),
    setPositions: (placed: Positions): void => placeOn(cy, folders, placed),
    showFolders: (scene: FolderScene | null, labelOf: (folder: string) => string): void => folders.show(scene, labelOf),
    applyTheme: (colors: ThemeColors): void => void cy.style(graphStyleOf(colors, fontFamily, glyphs)),
    widgetRects: (selected: string | null): WidgetRects => widgetRectsOf(cy, selected),
    markRowLess: (rows: RowPlan[]): void => markRowLess(cy, rows),
    exportPng: (bg: string): string => exportPngOf(cy, bg, window.devicePixelRatio),
    flowEdges: (): FlowEdgeGeometry[] => flowEdgesOf(cy),
    cy: (): Core => cy,
    tasks,
    atoms
  };

  new ResizeObserver(camera.resized).observe(container);
  listen(cy, handlers);
  cy.on('dragfreeon', 'node', (): void => folders.recentre());

  return view;
};
