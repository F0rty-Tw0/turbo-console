import { COUNTERS } from './worker-counters.const.ts';

/**
 * The real worker, counted, that queues every message posted to it while `window.__hold` is true (true from the start).
 * `__releaseWorker()` clears the hold and sends each live worker's queue in order; `__holdWorker()` sets it again;
 * `terminate()` drops that worker's queue.
 */
export const HELD_WORKER = `(() => {
  ${COUNTERS}
  window.__hold = true;
  const live = new Set();
  const RealWorker = window.Worker;
  window.Worker = class extends RealWorker {
    constructor(...args) {
      super(...args);
      this.queued = [];
      live.add(this);
      window.__workers += 1;
      this.addEventListener('message', () => {
        window.__workerMessages += 1;
      });
    }
    postMessage(...args) {
      if (window.__hold) {
        this.queued.push(args);
        return;
      }
      super.postMessage(...args);
    }
    flush() {
      const queued = this.queued;
      this.queued = [];
      for (const args of queued) super.postMessage(...args);
    }
    terminate() {
      this.queued = [];
      live.delete(this);
      window.__terminated += 1;
      super.terminate();
    }
  };
  window.__releaseWorker = () => {
    window.__hold = false;
    for (const worker of live) worker.flush();
  };
  window.__holdWorker = () => {
    window.__hold = true;
  };
})();`;
