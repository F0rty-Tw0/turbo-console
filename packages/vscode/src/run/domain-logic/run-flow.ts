import { turboRunArgs } from '@turbo-console/core';
import type { RunMatch } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { ALREADY_RUNNING_TEXT, START_TIMEOUT_MS } from '../common/run.const.ts';
import type { RunDefinition, RunEntry, RunPorts, RunRequest, Runs, Terminable } from '../common/run.type.ts';
import { runToMatchOf } from '../utils/run-end.util.ts';

const definitionOf = (request: RunRequest): RunDefinition => {
  const definition: RunDefinition = { root: request.root, id: request.task.id };

  return definition;
};

/**
 * Ends a run whose process never started and tells the user; nothing for a run no longer running, or, with
 * `launchedAt`, for another run of the task. Also the `onDidEndTask` handler (no `launchedAt`, the current run): a
 * run still running when its task ends never saw its process end (spec §4.5 step 5).
 */
export const failStart = (store: Runs, ports: RunPorts, definition: RunDefinition, launchedAt?: number): void => {
  const failed = store.failStart(definition, ports.now(), launchedAt);

  if (failed !== null) ports.notifyFailedToStart();
};

/**
 * The execution of `request`, or `null` once the reason is logged: a binary that is missing or cannot be run (VS Code
 * fires no task process event for a missing one), a name turbo would read as filter syntax, or a rejected launch.
 */
const launch = async (ports: RunPorts, request: RunRequest): Promise<Terminable | null> => {
  try {
    const canExecute = await ports.canExecute(request.binaryPath);

    if (!canExecute) {
      ports.log(logTextOf(`turbo binary missing or not executable: ${request.binaryPath}`));

      return null;
    }

    const args = turboRunArgs(request.task, request.packageName);

    return await ports.execute(request, args);
  } catch (error) {
    ports.log(logTextOf(error));

    return null;
  }
};

/** A newer run of the task launched in the same millisecond has the same deadline, so comparing `launchedAt` is enough. */
const onStartTimeout = (store: Runs, ports: RunPorts, definition: RunDefinition, launchedAt: number): void => {
  const entry = store.get(definition.root, definition.id);
  const isWaiting = entry?.state === 'running' && entry.processStartedAt === null && entry.launchedAt === launchedAt;

  if (isWaiting) failStart(store, ports, definition, launchedAt);
};

/**
 * Spec §4.5 run flow: a watchdog that ends the run as failed to start when its process has not started
 * `START_TIMEOUT_MS` after launch, the guard, then the launch. The task events drive the rest through the store.
 */
export const runTask = async (store: Runs, ports: RunPorts, request: RunRequest): Promise<void> => {
  const launchedAt = ports.now();
  const definition = definitionOf(request);

  // Armed before the run exists, so neither a launch that never settles nor a throwing change listener leaves it running.
  ports.after(START_TIMEOUT_MS, () => {
    onStartTimeout(store, ports, definition, launchedAt);
  });

  const isStarted = store.tryStart(request, launchedAt);

  if (!isStarted) {
    ports.info(ALREADY_RUNNING_TEXT);

    return;
  }

  const execution = await launch(ports, request);

  if (execution === null) {
    failStart(store, ports, definition, launchedAt);

    return;
  }

  store.attach(definition, launchedAt, execution);
};

const matchOf = async (ports: RunPorts, entry: RunEntry): Promise<RunMatch | null> => {
  const run = runToMatchOf(entry);

  if (run === null) return null;

  try {
    return await ports.match(entry.root, run);
  } catch (error) {
    ports.log(logTextOf(error));

    return null;
  }
};

/**
 * Spec §4.5 step 6, after `processEnded`: the summary match of exactly this run, or none (no summary, more than one, or
 * a lookup error, logged). `matching` always ends `false`.
 */
export const finishRun = async (store: Runs, ports: RunPorts, entry: RunEntry): Promise<void> => {
  const definition: RunDefinition = { root: entry.root, id: entry.taskId };
  const match = await matchOf(ports, entry);

  store.setMatch(definition, entry.launchedAt, match);
};
