import type { RunLogEvent } from '@turbo-console/core';

import { TURBO_LOG_FILE_KEY } from '../common/run.const.ts';
import type { RunEnv, RunPorts, RunRequest, Runs } from '../common/run.type.ts';
import { progressOwnerOf } from '../utils/run-entry.util.ts';
import { runLogPathOf } from '../utils/run-log-path.util.ts';

/**
 * Spec D10: opens the progress of a turbo run with the dependency snapshot of its root; a script or Run Without Turbo
 * gets none. Called before the launch awaits anything, so every end of the run finds it begun.
 */
export const beginProgress = (ports: RunPorts, request: RunRequest, launchedAt: number): void => {
  if (!request.task.isTurboTask) return;

  const owner = progressOwnerOf(request.root, request.task.id, launchedAt);
  const dependenciesOf = ports.dependenciesOf(request.root);

  ports.progress.begin(owner, dependenciesOf);
};

/**
 * Spec D6, D10: makes the log folder, starts the tail of the run's log file and answers the env that has turbo write
 * it. `undefined`, with no tail, when the folder cannot be made (level 2) or the run ended while it was being made.
 */
export const liveEnvOf = async (
  store: Runs,
  ports: RunPorts,
  request: RunRequest,
  launchedAt: number
): Promise<RunEnv | undefined> => {
  const { root } = request;
  const isPrepared = await ports.logs.prepare(root);

  if (!isPrepared) return undefined;

  const entry = store.get(root, request.task.id);
  const isLive = entry?.state === 'running' && entry.launchedAt === launchedAt;

  if (!isLive) return undefined;

  const owner = progressOwnerOf(root, request.task.id, launchedAt);
  const path = runLogPathOf(root, launchedAt, ports.randomId());
  const onEvent = (event: RunLogEvent): void => {
    ports.progress.event(owner, event);
  };
  const handle = ports.logs.start(root, path.file, onEvent);

  ports.progress.tail(owner, handle);

  const env: RunEnv = { [TURBO_LOG_FILE_KEY]: path.env };

  return env;
};
