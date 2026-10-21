import { join } from 'node:path';

import type { WorkerStub } from './graph.type.ts';

export const GRAPH_DIST_DIR = join(import.meta.dirname, '../../dist/graph');

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

/** Init script: records the duration of every long task in `window.__longTasks`; `window.__flushLongTasks` adds those not delivered yet. */
export const LONGTASK_RECORDER = `window.__longTasks = [];
const longTaskObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) window.__longTasks.push(entry.duration);
});
longTaskObserver.observe({ type: 'longtask', buffered: true });
window.__flushLongTasks = () => {
  for (const entry of longTaskObserver.takeRecords()) window.__longTasks.push(entry.duration);
};`;

/** Evaluates to the long task durations so far, including any the observer has not delivered yet. */
export const READ_LONG_TASKS = '(() => { window.__flushLongTasks(); return window.__longTasks; })()';

export const CLEAR_LONG_TASKS = 'window.__longTasks = []';

/** Resolves after two frames, so the effects of the last input have run. */
export const NEXT_FRAME = 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))';

export const ONE_FRAME = 'new Promise((resolve) => requestAnimationFrame(resolve))';

const COUNTERS = 'window.__workers = 0; window.__terminated = 0;';

const REAL_WORKER = `(() => {
  ${COUNTERS}
  const RealWorker = window.Worker;
  window.Worker = class extends RealWorker {
    constructor(...args) {
      super(...args);
      window.__workers += 1;
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

export const WORKER_STUBS: Readonly<Record<WorkerStub, string>> = {
  real: REAL_WORKER,
  throwOnce: THROW_ONCE_WORKER,
  error: ERROR_WORKER,
  silent: SILENT_WORKER
};

/** The `setState` value once it matches the probe's zoom, pan and selection (the save is debounced), else `null`. */
export const SAVED_STATE_MATCHING_PROBE = `(() => {
  const saved = window.__state;
  const probe = window.__tcGraphProbe;

  if (saved === undefined || probe === undefined) return null;

  const pan = probe.pan();
  const isCurrent = saved.selected === probe.selected() && saved.zoom === probe.zoom() && saved.pan.x === pan.x && saved.pan.y === pan.y;

  return isCurrent ? saved : null;
})()`;
