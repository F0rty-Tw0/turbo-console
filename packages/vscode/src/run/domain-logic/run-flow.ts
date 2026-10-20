import { turboRunArgs } from '@turbo-console/core';
import type { RunMatch } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { ALREADY_RUNNING_TEXT, START_TIMEOUT_MS, TASK_ENDED_TEXT } from '../common/run.const.ts';
import type { RunDefinition, RunEntry, RunPorts, RunRequest, Runs, Terminable } from '../common/run.type.ts';
import { runToMatchOf } from '../utils/run-end.util.ts';
import { processNameOf } from '../utils/run-entry.util.ts';
import { refusalOf } from '../utils/run-refusal.util.ts';
import { startTimeoutText, startWaitText } from '../utils/run-text.util.ts';

const definitionOf = (request: RunRequest): RunDefinition => {
  const definition: RunDefinition = { root: request.root, id: request.task.id };

  return definition;
};

/**
 * A run whose process never started: its launch token (none for the current run), the reason, unless already logged,
 * and whether VS Code already ended its task, so its execution is not terminated.
 */
type StartEnd = {
  readonly definition: RunDefinition;
  readonly launchedAt?: number | undefined;
  readonly reason?: string;
  readonly isTaskEnded?: boolean;
};

/**
 * Ends a run whose process never started, terminating its execution unless its task already ended; nothing for a run no
 * longer running, or, with `launchedAt`, for another run of the task. Only a run that ends as failed to start logs its
 * reason and tells the user, naming the process the ended run started: one the user stopped first ends as stopped,
 * quietly.
 */
const endStart = (store: Runs, ports: RunPorts, end: StartEnd): void => {
  const ended = store.failStart(end.definition, ports.now(), end.launchedAt, end.isTaskEnded);

  if (ended?.state !== 'failed-to-start') return;

  if (end.reason !== undefined) ports.log(logTextOf(end.reason));

  ports.notifyFailedToStart(processNameOf(ended));
};

/**
 * The `onDidEndTask` handler: a run still running when its task ends never saw its process end (spec §4.5 step 5).
 * With `launchedAt`, only the run launched then. The task is gone, so its execution is not terminated.
 */
export const taskEnded = (store: Runs, ports: RunPorts, definition: RunDefinition, launchedAt?: number): void => {
  endStart(store, ports, { definition, launchedAt, reason: TASK_ENDED_TEXT, isTaskEnded: true });
};

/**
 * The turbo execution of `request`, or `null` once the reason is logged: a binary that is missing or cannot be run (VS
 * Code fires no task process event for a missing one).
 */
const launchTurbo = async (ports: RunPorts, request: RunRequest, launchedAt: number): Promise<Terminable | null> => {
  const canExecute = await ports.canExecute(request.binaryPath);

  if (!canExecute) {
    ports.log(logTextOf(`turbo binary missing or not executable: ${request.binaryPath}`));

    return null;
  }

  const args = turboRunArgs(request.task, request.packageName, { force: request.force }, request.singlePackage);

  return ports.execute(request, args, launchedAt);
};

/**
 * The execution of `request`, or `null` once the reason is logged: a turbo launch that cannot start, a name turbo would
 * read as filter syntax, or a rejected launch. A script skips the binary check: the shell reports a missing package
 * manager as an exit code (spec 1c-b §4.3 step 3).
 */
const launch = async (ports: RunPorts, request: RunRequest, launchedAt: number): Promise<Terminable | null> => {
  try {
    if (request.task.isTurboTask) return await launchTurbo(ports, request, launchedAt);

    return await ports.executeScript(request, launchedAt);
  } catch (error) {
    ports.log(logTextOf(error));

    return null;
  }
};

/**
 * Ends a run whose launch has not settled; one VS Code holds is only logged, so a run left waiting for good leaves a
 * trace. A newer run of the task launched in the same millisecond has the same deadline, so comparing `launchedAt` is
 * enough.
 */
const onStartTimeout = (store: Runs, ports: RunPorts, start: StartEnd, isLaunched: boolean): void => {
  const entry = store.get(start.definition.root, start.definition.id);
  const isWaiting = entry?.state === 'running' && entry.processStartedAt === null && entry.launchedAt === start.launchedAt;

  if (!isWaiting) return;

  const processName = processNameOf(entry);

  if (isLaunched) ports.log(logTextOf(startWaitText(processName)));
  else endStart(store, ports, { ...start, reason: startTimeoutText(processName) });
};

/**
 * Spec §4.5 run flow: a request `refusalOf` refuses (spec 1c-b §4.3: an unsafe script, Run Without Cache on a script)
 * shows its text first, before the watchdog. Then a watchdog that ends the run as failed to start when its launch has
 * not settled `START_TIMEOUT_MS` after launch, the guard (a running entry, or a task of it VS Code already runs), then
 * the launch. The task events drive the rest through the store.
 */
export const runTask = async (store: Runs, ports: RunPorts, request: RunRequest): Promise<void> => {
  const refusal = refusalOf(request);

  if (refusal !== null) {
    ports.info(refusal);

    return;
  }

  const launchedAt = ports.now();
  const definition = definitionOf(request);
  let isLaunched = false;

  // Armed before the run exists, so neither a launch that never settles nor a throwing change listener leaves it running.
  // Once VS Code holds the execution, its task events end the run: it may make the task active only after a save
  // prompt or an input the user takes any time over, and drops a terminate sent before then.
  ports.after(START_TIMEOUT_MS, () => {
    onStartTimeout(store, ports, { definition, launchedAt }, isLaunched);
  });

  // VS Code would hand back the running execution of the same task, which carries no token of this run: none of its
  // task events would end the run.
  const isActiveElsewhere = ports.isActive(definition);

  if (isActiveElsewhere) {
    ports.info(ALREADY_RUNNING_TEXT);
    ports.log(logTextOf(`${definition.id} in ${definition.root} is already running as a VS Code task`));

    return;
  }

  const isStarted = store.tryStart(request, launchedAt);

  if (!isStarted) {
    ports.info(ALREADY_RUNNING_TEXT);

    return;
  }

  const execution = await launch(ports, request, launchedAt);

  isLaunched = true;

  if (execution === null) {
    endStart(store, ports, { definition, launchedAt });

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
 * a lookup error, logged). `matching` always ends `false`; nothing for an entry not waiting for a match (a stopped run).
 */
export const finishRun = async (store: Runs, ports: RunPorts, entry: RunEntry): Promise<void> => {
  if (!entry.matching) return;

  const definition: RunDefinition = { root: entry.root, id: entry.taskId };
  const match = await matchOf(ports, entry);

  store.setMatch(definition, entry.launchedAt, match);
};
