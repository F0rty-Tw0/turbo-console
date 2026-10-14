import { ChildProcess } from 'node:child_process';
import { subscribe, unsubscribe } from 'node:diagnostics_channel';

import type { SpawnCounter } from '../common/launch.type.ts';

const CHANNEL = 'child_process';

const VERSION_ARG = '--version';

type SpawnMessage = {
  readonly process: ChildProcess;
};

const isSpawnMessage = (message: unknown): message is SpawnMessage => {
  const isObject = typeof message === 'object' && message !== null;

  return isObject && 'process' in message && message.process instanceof ChildProcess;
};

/**
 * Spec §5.1 V1: counts the turbo spawns of this extension host through the `child_process` diagnostics channel. Only
 * spawns of `turboPath` count (VS Code's own git spawns arrive too), and never a `--version` call (the override's
 * once-per-process resolution). Node publishes before it sets `spawnfile` and `spawnargs` (observed on Linux), so each
 * message is read on the next tick.
 */
export const countTurboSpawns = (turboPath: string): SpawnCounter => {
  let count = 0;

  const read = (child: ChildProcess): void => {
    const isTurbo = child.spawnfile === turboPath;
    const isVersion = child.spawnargs.includes(VERSION_ARG);

    if (isTurbo && !isVersion) count += 1;
  };

  const onMessage = (message: unknown): void => {
    if (!isSpawnMessage(message)) return;

    process.nextTick(read, message.process);
  };

  subscribe(CHANNEL, onMessage);

  const counter: SpawnCounter = {
    count: () => count,
    reset: () => {
      count = 0;
    },
    dispose: () => {
      unsubscribe(CHANNEL, onMessage);
    }
  };

  return counter;
};
