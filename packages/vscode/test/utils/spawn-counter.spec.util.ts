import { ChildProcess } from 'node:child_process';
import { subscribe, unsubscribe } from 'node:diagnostics_channel';
import { basename } from 'node:path';

import { idleMs } from './timing.spec.util.ts';
import type { DryRunClose, SpawnCounter, TurboRun } from '../common/launch.type.ts';

const CHANNEL = 'child_process';

const VERSION_ARG = '--version';

const DRY_RUN_ARG = '--dry=json';

const MICROSECONDS_PER_MS = 1000;

/** What a turbo binary is called when no path is known: the npm platform packages ship `turbo` or `turbo.exe`. */
const TURBO_FILE_NAMES: ReadonlySet<string> = new Set(['turbo', 'turbo.exe']);

type SpawnMessage = {
  readonly process: ChildProcess;
};

const isSpawnMessage = (message: unknown): message is SpawnMessage => {
  const isObject = typeof message === 'object' && message !== null;

  return isObject && 'process' in message && message.process instanceof ChildProcess;
};

const isTurboFile = (turboPath: string | null, file: string): boolean => {
  if (turboPath === null) return TURBO_FILE_NAMES.has(basename(file));

  return file === turboPath;
};

/**
 * Spec §5.1 V1: counts the turbo spawns of this extension host through the `child_process` diagnostics channel. Only
 * spawns of `turboPath` count (VS Code's own git spawns arrive too), and never a `--version` call (the override's
 * once-per-process resolution). Node publishes before it sets `spawnfile` and `spawnargs` (observed on Linux), so each
 * message is read on the next tick. With `turboPath` `null` (the setting is unset), any binary named `turbo` counts.
 * Each turbo process, `--version` calls included, is also timed from its spawn until it closes, with the cpu time this
 * thread used over that range, so `turboMs` counts only the time this thread sat idle waiting on turbo: a `close` that
 * our own blocking work delays stays our own work. The cpu time comes from `process.threadCpuUsage`, because the VS Code
 * extension host never starts Node's loop timing (`performance.nodeTiming.loopStart` is -1), which leaves
 * `performance.eventLoopUtilization` all zeros there.
 */
export const countTurboSpawns = (turboPath: string | null): SpawnCounter => {
  let count = 0;
  let dryRuns: string[][] = [];
  let closes: DryRunClose[] = [];
  const runs: TurboRun[] = [];

  const onDryRunClose = (_code: number | null, signal: NodeJS.Signals | null): void => {
    const close: DryRunClose = { at: performance.now(), aborted: signal !== null };

    closes.push(close);
  };

  const read = (child: ChildProcess, start: number, startCpu: NodeJS.CpuUsage): void => {
    const isTurbo = isTurboFile(turboPath, child.spawnfile);
    const isVersion = child.spawnargs.includes(VERSION_ARG);
    const onClose = (): void => {
      const cpu = process.threadCpuUsage(startCpu);
      const busyMs = (cpu.user + cpu.system) / MICROSECONDS_PER_MS;
      const run: TurboRun = { start, end: performance.now(), busyMs };

      runs.push(run);
    };

    if (!isTurbo) return;

    child.once('close', onClose);

    if (isVersion) return;

    count += 1;

    const isDryRun = child.spawnargs.includes(DRY_RUN_ARG);

    if (!isDryRun) return;

    dryRuns.push([...child.spawnargs]);
    child.once('close', onDryRunClose);
  };

  const onMessage = (message: unknown): void => {
    if (!isSpawnMessage(message)) return;

    const start = performance.now();
    const startCpu = process.threadCpuUsage();

    process.nextTick(read, message.process, start, startCpu);
  };

  subscribe(CHANNEL, onMessage);

  const counter: SpawnCounter = {
    count: () => count,
    turboMs: (window) => idleMs(runs, window),
    dryRuns: () => dryRuns.map((args) => [...args]),
    dryRunCloses: () => [...closes],
    reset: () => {
      count = 0;
      dryRuns = [];
      closes = [];
    },
    dispose: () => {
      unsubscribe(CHANNEL, onMessage);
    }
  };

  return counter;
};
