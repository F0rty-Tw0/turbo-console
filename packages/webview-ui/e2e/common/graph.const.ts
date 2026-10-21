import { join } from 'node:path';

import type { WorkerStub } from './graph.type.ts';

export const GRAPH_DIST_DIR = join(import.meta.dirname, '../../dist/graph');

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

/** Resolves after two frames, so the effects of the last input have run. */
export const NEXT_FRAME = 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))';

export const ONE_FRAME = 'new Promise((resolve) => requestAnimationFrame(resolve))';

const COUNTERS = 'window.__workers = 0; window.__terminated = 0; window.__workerMessages = 0;';

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
  throwOnce: THROW_ONCE_WORKER,
  error: ERROR_WORKER,
  silent: SILENT_WORKER,
  malformed: MALFORMED_WORKER
};
