import { REDUCED_MOTION_QUERY } from './common/flow.const.ts';
import type { FlowControl, FlowEdgeGeometry } from './common/flow.type.ts';
import { CODICON_FONT, CODICON_WAIT_MS, GLYPH_CODE_POINTS, GLYPH_FALLBACK_WARNING } from './common/graph-glyph.const.ts';
import type {
  FlowFactory,
  GraphController,
  GraphView,
  GraphViewFactory,
  NodeSizer,
  TextMeasure,
  Viewport
} from './common/graph-page.type.ts';
import type { GraphProbe } from './common/graph-probe.type.ts';
import { FALLBACK_TIMEOUT_MS, NODE_FONT_SIZE, OVERLAY_MEDIA_QUERY, VIEW_STATE_DEBOUNCE_MS } from './common/graph.const.ts';
import type { ThemeColors } from './common/theme-colors.type.ts';
// Imported before any module that loads Cytoscape: elk-client creates the one `tc-elk` policy as it loads.
import { createElk } from './data-access/elk-client.ts';
import { breadthfirstPositions } from './data-access/fallback-layout.ts';
import { createGraphProbe, exposeProbe } from './data-access/graph-probe.ts';
import { createGraphView } from './data-access/graph-view.ts';
import { labelSizer, slotSizer, textMeasure } from './data-access/label-measure.ts';
import { createLayoutRunner } from './data-access/layout-runner.ts';
import { createViewStateSaver } from './data-access/view-state-saver.ts';
import { createGraphController } from './domain-logic/graph-controller.ts';
import { GraphFlow } from './domain-logic/graph-flow.ts';
import { buildControls } from './ui/controls-elements.ts';
import { fitFlowCanvas } from './ui/flow-canvas.ts';
import { detailsViews, taskDetailsViews, taskViews, widgetViews } from './ui/graph-views.ts';
import { renderLegend } from './ui/legend-elements.ts';
import { buildPage } from './ui/page-elements.ts';
import { codiconReadyOf } from './utils/codicon-ready.util.ts';
import { themeColorsOf } from './utils/theme-colors.util.ts';
import { createBridge } from '../bridge/data-access/create-bridge.ts';

// Canvas `ctx.font` cannot resolve `var(--vscode-font-family)`, so labels are measured in the body's computed family.
const fontFamily = getComputedStyle(document.body).fontFamily;

/** The graph colours from `body`'s computed theme variables, read now. */
const themeColors = (): ThemeColors => {
  const style = getComputedStyle(document.body);

  return themeColorsOf((name: string): string => style.getPropertyValue(name));
};

const background = (): string => {
  const colors = themeColors();

  return colors.background;
};

const bridge = createBridge();
const page = buildPage();
const saver = createViewStateSaver(bridge.saveState, VIEW_STATE_DEBOUNCE_MS);
const runner = createLayoutRunner({ createElk, timeoutMs: FALLBACK_TIMEOUT_MS, fallback: breadthfirstPositions });
const now = (): number => performance.now();
const after = (run: () => void, ms: number): number => window.setTimeout(run, ms);
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
    after,
    cancelAfter: (id: number): void => window.clearTimeout(id),
    isReduced: (): boolean => reducedMotion.matches
  });

  return flow;
};

/** The task nodes' sizer: the glyph slot when the page draws glyphs, else the bare label. */
const taskSizerOf = (glyphs: boolean, measure: TextMeasure): NodeSizer => {
  const glyphMeasure = textMeasure(`${NODE_FONT_SIZE}px codicon, ${fontFamily}`);
  const slot = slotSizer(glyphMeasure);
  const plain = labelSizer(measure);
  const sizer = glyphs ? slot : plain;

  return sizer;
};

const controllerOf = (glyphs: boolean): GraphController => {
  const measure = textMeasure(`${NODE_FONT_SIZE}px ${fontFamily}`);
  const createView: GraphViewFactory = (container, handlers) => createGraphView(container, handlers, fontFamily, glyphs);
  const controller = createGraphController({
    bridge,
    page,
    createView,
    createFlow,
    runner,
    saver,
    sizeOf: labelSizer(measure),
    taskSizeOf: taskSizerOf(glyphs, measure),
    measure,
    now,
    build: buildControls,
    views: detailsViews,
    widgetViews,
    taskViews,
    taskDetailsViews,
    overlay,
    background
  });

  return controller;
};

const applyThemeTo = (controller: GraphController): void => {
  const colors = themeColors();

  controller.view.applyTheme(colors);
  controller.flow.setColor(colors.background);
  renderLegend(page, colors);
};

const flushWhenHidden = (): void => {
  if (document.visibilityState === 'hidden') saver.flush();
};

const observePage = (controller: GraphController): void => {
  const applyTheme = (): void => applyThemeTo(controller);
  /** Reduced motion turned on mid-flow ends the dashes now, not at the idle stop. */
  const stopFlowWhenReduced = (): void => {
    if (reducedMotion.matches) controller.flow.stop();
  };
  const themeObserver = new MutationObserver(applyTheme);
  const flowSizer = new ResizeObserver((): void => fitFlowCanvas(page.flow, page.container));

  applyTheme();
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  flowSizer.observe(page.container);
  reducedMotion.addEventListener('change', stopFlowWhenReduced);
  document.addEventListener('visibilitychange', flushWhenHidden);
  addEventListener('pagehide', saver.flush);
};

/**
 * Everything that needs the glyph decision. The page root goes into the document in the same synchronous run as
 * `bridge.onMessage`: the e2e page object posts as soon as the container shows, so a container shown earlier drops the first state.
 */
const start = (glyphs: boolean): void => {
  document.body.append(page.root);

  const controller = controllerOf(glyphs);

  observePage(controller);
  bridge.onMessage(controller.receive);
  bridge.ready();
  exposeProbe(window, (): GraphProbe => createGraphProbe(controller.view, controller.facts));
};

const loadCodicon = async (): Promise<unknown[]> => document.fonts.load(CODICON_FONT, GLYPH_CODE_POINTS.pass);

const startWhenFontSettles = async (): Promise<void> => {
  const glyphs = await codiconReadyOf(loadCodicon, CODICON_WAIT_MS, after);

  if (!glyphs) console.warn(GLYPH_FALLBACK_WARNING);

  start(glyphs);
};

void startWhenFontSettles();
