import type { DetailsViews } from './common/details.type.ts';
import type { GraphViewFactory, NodeSizer, TextMeasure } from './common/graph-page.type.ts';
import { FALLBACK_TIMEOUT_MS, NODE_FONT_SIZE, OVERLAY_MEDIA_QUERY, VIEW_STATE_DEBOUNCE_MS } from './common/graph.const.ts';
import type { NodeSize } from './common/node-size.type.ts';
// Imported before any module that loads Cytoscape: elk-client creates the one `tc-elk` policy as it loads.
import { createElk } from './data-access/elk-client.ts';
import { breadthfirstPositions } from './data-access/fallback-layout.ts';
import { createGraphProbe, exposeProbe } from './data-access/graph-probe.ts';
import { createGraphView } from './data-access/graph-view.ts';
import { createLayoutRunner } from './data-access/layout-runner.ts';
import { createViewStateSaver } from './data-access/view-state-saver.ts';
import { createGraphController } from './domain-logic/graph-controller.ts';
import { buildControls } from './ui/controls-elements.ts';
import { buildDetails } from './ui/details-elements.ts';
import { emptyView } from './ui/details-empty.ts';
import { explainView } from './ui/details-explain.ts';
import { hintView } from './ui/details-hint.ts';
import { linkView } from './ui/details-link.ts';
import { packageView } from './ui/details-package.ts';
import { candidateItems, pickingView } from './ui/details-picking.ts';
import { stepItems, traceView } from './ui/details-trace.ts';
import { buildPage } from './ui/page-elements.ts';
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
const createView: GraphViewFactory = (container, handlers) => createGraphView(container, handlers, fontFamily);
const now = (): number => performance.now();
const views: DetailsViews = {
  build: buildDetails,
  empty: emptyView,
  package: packageView,
  link: linkView,
  explain: explainView,
  picking: pickingView,
  trace: traceView,
  hint: hintView,
  candidateItems,
  stepItems
};
const overlay = window.matchMedia(OVERLAY_MEDIA_QUERY);
const controller = createGraphController({
  bridge,
  page,
  createView,
  runner,
  saver,
  sizeOf: labelSizer(measure),
  measure,
  now,
  build: buildControls,
  views,
  overlay
});

const applyTheme = (): void => {
  const style = getComputedStyle(document.body);
  const colors = themeColorsOf((name: string): string => style.getPropertyValue(name));

  controller.view.applyTheme(colors);
};

const flushWhenHidden = (): void => {
  if (document.visibilityState === 'hidden') saver.flush();
};

const themeObserver = new MutationObserver(applyTheme);

applyTheme();
themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
document.addEventListener('visibilitychange', flushWhenHidden);
addEventListener('pagehide', saver.flush);
bridge.onMessage(controller.receive);
bridge.ready();
exposeProbe(window, createGraphProbe(controller.view, controller.facts));
