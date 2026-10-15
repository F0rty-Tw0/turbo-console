import { rssOf } from './rss-probe.ts';
import type { RssProbe, WatchMemoryOptions } from '../common/turbo.type.ts';

/** `probe`'s sample, with a rejection read as `null`: `rssOf` never rejects, a custom probe might. */
const sampleOf = async (probe: RssProbe, pid: number): Promise<number | null> => {
  try {
    return await probe(pid);
  } catch {
    return null;
  }
};

/**
 * Polls the resident memory of `pid` and calls `onExceeded` once with the first sample over `maxRssBytes`, then stops.
 * The first poll runs after one `intervalMs`, so a short query never spawns a probe. A `null` sample is ignored. The
 * next poll is scheduled after the previous one settles, so a slow probe cannot pile up. Timers are unref-ed, so the
 * watcher never keeps the process alive. Returns `stop`: afterwards nothing is probed and a probe still in flight
 * calls nothing, which keeps a reused pid from being read. `stop` is idempotent.
 */
export const watchMemory = (pid: number, options: WatchMemoryOptions): (() => void) => {
  const { maxRssBytes, intervalMs, probe = rssOf, onExceeded } = options;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const pause = async (): Promise<undefined> => {
    const { promise, resolve } = Promise.withResolvers<undefined>();
    const wake = (): void => {
      resolve(undefined);
    };

    timer = setTimeout(wake, intervalMs);
    timer.unref();

    return promise;
  };

  const run = async (): Promise<void> => {
    for (;;) {
      await pause();

      const rss = await sampleOf(probe, pid);

      if (stopped) return;

      if (rss !== null && rss > maxRssBytes) {
        stopped = true;
        onExceeded(rss);

        return;
      }
    }
  };

  const stop = (): void => {
    stopped = true;
    clearTimeout(timer);
  };

  void run();

  return stop;
};
