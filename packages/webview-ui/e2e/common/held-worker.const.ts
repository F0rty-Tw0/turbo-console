import { COUNTERS } from './worker-counters.const.ts';

/**
 * The real worker, counted, that queues every message posted to it while `window.tcHold` is true (true from the start).
 * `tcReleaseWorker()` clears the hold and sends each live worker's queue in order; `tcHoldWorker()` sets it again;
 * `terminate()` drops that worker's queue.
 */
export const HELD_WORKER = `(() => {
  ${COUNTERS}
  window.tcHold = true;
  const live = new Set();
  const RealWorker = window.Worker;
  window.Worker = class extends RealWorker {
    constructor(...args) {
      super(...args);
      this.queued = [];
      live.add(this);
      window.tcWorkers += 1;
      this.addEventListener('message', () => {
        window.tcWorkerMessages += 1;
      });
    }
    postMessage(...args) {
      if (window.tcHold) {
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
      window.tcTerminated += 1;
      super.terminate();
    }
  };
  window.tcReleaseWorker = () => {
    window.tcHold = false;
    for (const worker of live) worker.flush();
  };
  window.tcHoldWorker = () => {
    window.tcHold = true;
  };
})();`;
