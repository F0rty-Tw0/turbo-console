import { join } from 'node:path';

import type { WorkerStub } from './graph.type.ts';
import { HELD_WORKER } from './held-worker.const.ts';
import { COUNTERS } from './worker-counters.const.ts';
import { TASK_MODE_LABEL } from '../../src/graph/common/graph-task.const.ts';
import {
  CLEAR_LABEL,
  CONTROLS_LABEL,
  DETAILS_LABEL,
  EXPORT_LABEL,
  FALLBACK_TIMEOUT_MS,
  FIT_LABEL,
  RELAYOUT_LABEL
} from '../../src/graph/common/graph.const.ts';

export const GRAPH_DIST_DIR = join(import.meta.dirname, '../../dist/graph');

/** Every toolbar button's accessible name, in DOM order. */
export const TOOLBAR_LABELS = [TASK_MODE_LABEL, CONTROLS_LABEL, DETAILS_LABEL, FIT_LABEL, RELAYOUT_LABEL, EXPORT_LABEL, CLEAR_LABEL];

/** How far from an edge's drawn segment a click must land to miss it, in CSS pixels. */
export const EDGE_CLEARANCE_PX = 14;

/** The package count of `largeState` by default. */
export const LARGE_PACKAGE_COUNT = 300;

/** Every `--vscode-*` name the theme stubs set, so `applyTheme` can clear them between themes. */
export const THEME_VAR_NAMES = [
  '--vscode-editor-background',
  '--vscode-foreground',
  '--vscode-panel-border',
  '--vscode-contrastBorder',
  '--vscode-descriptionForeground',
  '--vscode-focusBorder'
];

/** Init script: opts the page into exposing `window.__tcGraphProbe`. */
export const PROBE_WANTED = 'window.__tcGraphProbeWanted = true;';

/** Init script: every canvas text measurement throws, as a page whose label sizing broke. */
export const BROKEN_MEASURE = `CanvasRenderingContext2D.prototype.measureText = () => {
  throw new Error('measureText is broken');
};`;

/** The CDP `Performance.getMetrics` entry holding the main thread's CPU time, in seconds. */
export const THREAD_TIME_METRIC = 'ThreadTime';

export const MS_PER_SECOND = 1000;

/**
 * macOS runners read the grouped pan 683-1422 ms and the header-rows pan 1559-2842 ms (C58, 2026-10-23, `pan-cpu-ms`
 * log lines): about 2x spread on one runner image, inferred to be host CPU loss counted as thread time. Their budgets
 * sit about 1.7x over the worst reading, still under the ~3150 ms an unpatched Cytoscape would read there (inferred);
 * Linux and Windows keep the tight budgets on the same code and catch a lost patch anyway. Stopgap until C58's
 * calibrated budget.
 */
export const IS_MAC_RUNNER = process.platform === 'darwin';

/** Chromium on macOS fires no `contextmenu` for Shift+F10, so a test that watches that event cannot run there. */
export const IS_SHIFT_F10_SILENT = process.platform === 'darwin';

export const SHIFT_F10_SILENT_REASON = 'Chromium on macOS fires no contextmenu event for Shift+F10';

/** An empty page, so the renderer that loads it has run almost nothing before a CPU read. */
export const BLANK_PAGE = 'data:text/html,<p>blank</p>';

/** Resolves after two frames, so the effects of the last input have run. */
export const NEXT_FRAME = 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))';

export const ONE_FRAME = 'new Promise((resolve) => requestAnimationFrame(resolve))';

/** Every canvas read throws from now on, so an image export fails. */
export const BREAK_CANVAS_READS = "HTMLCanvasElement.prototype.toDataURL = () => { throw new Error('graph e2e: canvas read'); }";

/** The real worker, counted: each one built, each terminated, and each message any of them sent the page. */
const REAL_WORKER = `(() => {
  ${COUNTERS}
  const RealWorker = window.Worker;
  window.Worker = class extends RealWorker {
    constructor(...args) {
      super(...args);
      window.__workers += 1;
      this.addEventListener('message', () => {
        window.__workerMessages += 1;
      });
    }
    terminate() {
      window.__terminated += 1;
      super.terminate();
    }
  };
})();`;

const THROW_ONCE_WORKER = `(() => {
  ${COUNTERS}
  const RealWorker = window.Worker;
  let hasThrown = false;
  window.Worker = class extends RealWorker {
    constructor(...args) {
      window.__workers += 1;
      if (!hasThrown) {
        hasThrown = true;
        throw new Error('worker blocked');
      }
      super(...args);
    }
    terminate() {
      window.__terminated += 1;
      super.terminate();
    }
  };
})();`;

/** A worker that raises `error` on its first message. elk-client listens with `addEventListener('error', ...)`. */
const ERROR_WORKER = `(() => {
  ${COUNTERS}
  window.Worker = class extends EventTarget {
    constructor() {
      super();
      window.__workers += 1;
    }
    postMessage() {
      setTimeout(() => {
        const event = new ErrorEvent('error', { message: 'worker crashed' });
        this.dispatchEvent(event);
        this.onerror?.(event);
      }, 0);
    }
    terminate() {
      window.__terminated += 1;
    }
  };
})();`;

const SILENT_WORKER = `(() => {
  ${COUNTERS}
  window.Worker = class extends EventTarget {
    constructor() {
      super();
      window.__workers += 1;
    }
    postMessage() {}
    terminate() {
      window.__terminated += 1;
    }
  };
})();`;

/** A worker that answers each command after 200 ms, with a layout whose `children` is not an array, so reading it throws. */
const MALFORMED_WORKER = `(() => {
  ${COUNTERS}
  window.Worker = class extends EventTarget {
    constructor() {
      super();
      window.__workers += 1;
    }
    postMessage(message) {
      const data = message.cmd === 'layout' ? { id: 'root', children: {} } : null;
      setTimeout(() => {
        window.__workerMessages += 1;
        this.onmessage?.({ data: { id: message.id, data } });
      }, 200);
    }
    terminate() {
      window.__terminated += 1;
    }
  };
})();`;

export const WORKER_STUBS: Readonly<Record<WorkerStub, string>> = {
  real: REAL_WORKER,
  held: HELD_WORKER,
  throwOnce: THROW_ONCE_WORKER,
  error: ERROR_WORKER,
  silent: SILENT_WORKER,
  malformed: MALFORMED_WORKER
};

/** The widest editor that still lays the details panel over the canvas: one pixel under the 960 px breakpoint. */
export const OVERLAY_WIDTH_PX = 959;

/** The narrowest editor that docks the details panel beside the canvas. */
export const DOCKED_WIDTH_PX = 960;

/** The width of the controls aside. */
const CONTROLS_WIDTH_PX = 260;

/** The width of the details aside, docked or overlaid. */
export const DETAILS_WIDTH_PX = 280;

/** The drawn canvas width at `OVERLAY_WIDTH_PX`: the overlay takes none. */
export const OVERLAY_CANVAS_PX = OVERLAY_WIDTH_PX - CONTROLS_WIDTH_PX;

/** The drawn canvas width at `DOCKED_WIDTH_PX`: both asides take theirs. */
export const DOCKED_CANVAS_PX = DOCKED_WIDTH_PX - CONTROLS_WIDTH_PX - DETAILS_WIDTH_PX;

/** A header widget's button size, and its inset from the box edge, in px; `src/graph/common/graph.const.ts` holds the same numbers. */
export const WIDGET_BUTTON_PX = 24;

export const WIDGET_INSET_PX = 8;

/** Header widgets hide while the box is under this many px wide on screen. */
export const WIDGET_MIN_BOX_PX = 120;

/** The most a folder collapse or expand may take, from the toggle to the first frame after it, in ms. */
export const TOGGLE_BUDGET_MS = 100;

/**
 * How long to wait for a layout to settle: the page's ELK timeout (which already covers the worker start) plus room
 * for the page's message handling and first draw on a slow runner, where an uncached 301-package layout took over the
 * 5 s poll default.
 */
export const LAYOUT_SETTLE_MS = 3 * FALLBACK_TIMEOUT_MS;
