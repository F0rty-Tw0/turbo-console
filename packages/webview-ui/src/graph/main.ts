import type { DetailsViews } from './common/details.type.ts';
import { REDUCED_MOTION_QUERY } from './common/flow.const.ts';
import type { FlowControl, FlowEdgeGeometry } from './common/flow.type.ts';
import type { FlowFactory, GraphView, GraphViewFactory, NodeSizer, TextMeasure, Viewport } from './common/graph-page.type.ts';
import type { GraphProbe } from './common/graph-probe.type.ts';
import { FALLBACK_TIMEOUT_MS, NODE_FONT_SIZE, OVERLAY_MEDIA_QUERY, VIEW_STATE_DEBOUNCE_MS } from './common/graph.const.ts';
import type { NodeSize } from './common/node-size.type.ts';
import type { TaskControlsViews } from './common/task-controls.type.ts';
import type { TaskDetailsViews } from './common/task-details.type.ts';
import type { ThemeColors } from './common/theme-colors.type.ts';
import type { WidgetViews } from './common/widget.type.ts';
// Imported before any module that loads Cytoscape: elk-client creates the one `tc-elk` policy as it loads.
import { createElk } from './data-access/elk-client.ts';
import { breadthfirstPositions } from './data-access/fallback-layout.ts';
import { createGraphProbe, exposeProbe } from './data-access/graph-probe.ts';
import { createGraphView } from './data-access/graph-view.ts';
import { createLayoutRunner } from './data-access/layout-runner.ts';
import { createViewStateSaver } from './data-access/view-state-saver.ts';
import { createGraphController } from './domain-logic/graph-controller.ts';
import { GraphFlow } from './domain-logic/graph-flow.ts';
import { breadcrumbLine, buildBreadcrumb } from './ui/breadcrumb-elements.ts';
import { buildControls } from './ui/controls-elements.ts';
import { buildDetails } from './ui/details-elements.ts';
import { emptyView } from './ui/details-empty.ts';
import { explainView } from './ui/details-explain.ts';
import { folderView } from './ui/details-folder.ts';
import { hintView } from './ui/details-hint.ts';
import { linkView } from './ui/details-link.ts';
import { packageView } from './ui/details-package.ts';
import { candidateItems, pickingView } from './ui/details-picking.ts';
import { stepItems, traceView } from './ui/details-trace.ts';
import { fitFlowCanvas } from './ui/flow-canvas.ts';
import { buildPage } from './ui/page-elements.ts';
import { buildTaskControls, buildTaskRow } from './ui/task-controls-elements.ts';
import { buildTaskDetails, buildTaskDetailsEmpty, buildTaskDetailsPanel } from './ui/task-details-elements.ts';
import { buildFolderRow, buildPackageButton } from './ui/widget-elements.ts';
import { buildMenu } from './ui/widget-menu.ts';
import { nodeSizeOf } from './utils/node-size.util.ts';
import { themeColorsOf } from './utils/theme-colors.util.ts';
import { createBridge } from '../bridge/data-access/create-bridge.ts';

// Canvas `ctx.font` cannot resolve `var(--vscode-font-family)`, so labels are measured in the body's computed family.
const fontFamily = getComputedStyle(document.body).fontFamily;

const textMeasure = (): TextMeasure => {
  const context = document.createElement('canvas').getContext('2d');

  if (context === null) throw new Error('graph page: no 2d canvas context to measure labels');

  context.font = `${NODE_FONT_SIZE}px ${fontFamily}`;

  const measure = (text: string): number => context.measureText(text).width;

  return measure;
};

/** The graph colours from `body`'s computed theme variables, read now. */
const themeColors = (): ThemeColors => {
  const style = getComputedStyle(document.body);

  return themeColorsOf((name: string): string => style.getPropertyValue(name));
};

const background = (): string => {
  const colors = themeColors();

  return colors.background;
};

const labelSizer = (measure: TextMeasure): NodeSizer => {
  const sizeOf = (name: string): NodeSize => nodeSizeOf(measure(name));

  return sizeOf;
};

const measure = textMeasure();

const bridge = createBridge();
const page = buildPage();

document.body.append(page.root);

const saver = createViewStateSaver(bridge.saveState, VIEW_STATE_DEBOUNCE_MS);
const runner = createLayoutRunner({ createElk, timeoutMs: FALLBACK_TIMEOUT_MS, fallback: breadthfirstPositions });
const createView: GraphViewFactory = (container, handlers) => createGraphView(container, handlers, fontFamily, false);
const now = (): number => performance.now();
const views: DetailsViews = {
  build: buildDetails,
  empty: emptyView,
  package: packageView,
  link: linkView,
  explain: explainView,
  picking: pickingView,
  trace: traceView,
  folder: folderView,
  hint: hintView,
  candidateItems,
  stepItems
};
const widgetViews: WidgetViews = {
  row: buildFolderRow,
  packageButton: buildPackageButton,
  menu: buildMenu,
  breadcrumb: buildBreadcrumb,
  breadcrumbLine
};
const taskViews: TaskControlsViews = { build: buildTaskControls, row: buildTaskRow };
const taskDetailsViews: TaskDetailsViews = { panel: buildTaskDetailsPanel, empty: buildTaskDetailsEmpty, view: buildTaskDetails };
const overlay = window.matchMedia(OVERLAY_MEDIA_QUERY);
const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
const createFlow: FlowFactory = (view: GraphView): FlowControl => {
  const flow = new GraphFlow({
    canvas: page.flow,
    container: page.container,
    edges: (): FlowEdgeGeometry[] => view.flowEdges(),
    viewport: (): Viewport => view.viewport(),
    now,
    frame: (run: () => void): number => requestAnimationFrame(run),
    cancelFrame: (id: number): void => cancelAnimationFrame(id),
    after: (run: () => void, ms: number): number => window.setTimeout(run, ms),
    cancelAfter: (id: number): void => window.clearTimeout(id),
    isReduced: (): boolean => reducedMotion.matches
  });

  return flow;
};
const controller = createGraphController({
  bridge,
  page,
  createView,
  createFlow,
  runner,
  saver,
  sizeOf: labelSizer(measure),
  taskSizeOf: labelSizer(measure),
  measure,
  now,
  build: buildControls,
  views,
  widgetViews,
  taskViews,
  taskDetailsViews,
  overlay,
  background
});

const applyTheme = (): void => {
  const colors = themeColors();

  controller.view.applyTheme(colors);
  controller.flow.setColor(colors.background);
};

/** Reduced motion turned on mid-flow ends the dashes now, not at the idle stop. */
const stopFlowWhenReduced = (): void => {
  if (reducedMotion.matches) controller.flow.stop();
};

const flushWhenHidden = (): void => {
  if (document.visibilityState === 'hidden') saver.flush();
};

const themeObserver = new MutationObserver(applyTheme);
const flowSizer = new ResizeObserver((): void => fitFlowCanvas(page.flow, page.container));

applyTheme();
themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
flowSizer.observe(page.container);
reducedMotion.addEventListener('change', stopFlowWhenReduced);
document.addEventListener('visibilitychange', flushWhenHidden);
addEventListener('pagehide', saver.flush);
bridge.onMessage(controller.receive);
bridge.ready();
exposeProbe(window, (): GraphProbe => createGraphProbe(controller.view, controller.facts));
