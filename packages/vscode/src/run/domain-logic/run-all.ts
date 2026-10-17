import { turboRunAllArgs } from '@turbo-console/core';

import type { RootState, Roots } from '../../roots/common/coordinator.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { NO_TASKS_TEXT, ROOT_PLACEHOLDER, TASK_PLACEHOLDER } from '../common/picker.const.ts';
import type { RunAllClaim, RunAllDefinition, RunAllLaunch, RunAllPorts, RunAllRequest } from '../common/run-all.type.ts';
import { ALREADY_RUNNING_TEXT, START_TIMEOUT_MS } from '../common/run.const.ts';
import type { Terminable } from '../common/run.type.ts';
import { rootItems, taskNameItems } from '../utils/picker-items.util.ts';
import { runAllKey, runAllKeyOf } from '../utils/run-all-task.util.ts';
import { startTimeoutText } from '../utils/run-text.util.ts';

/** One run all in flight: whether VS Code holds its task yet, by an execution handed over or a process started. */
type Slot = {
  // eslint-disable-next-line local/readonly-type-properties -- set in place as the launch progresses, so a claim sees it
  settled: boolean;
};

/** The run alls in flight, by key. Not the `RunStore`: they have no tree row and no result. */
export class RunAllGuard {
  private readonly slots = new Map<string, Slot>();

  /** Synchronous: whoever adds a key first owns it until the task ends or the launch fails. */
  public tryAdd(key: string): boolean {
    const isTaken = this.slots.has(key);

    if (!isTaken) this.slots.set(key, { settled: false });

    return !isTaken;
  }

  /** The process of a task started; any task without a key here changes nothing. */
  public markStarted(definition: RunAllDefinition): void {
    const slot = this.slots.get(runAllKeyOf(definition));

    if (slot !== undefined) slot.settled = true;
  }

  /**
   * What the launch that just added `key` holds of it; each act of the claim is a no-op once another launch holds it. A
   * key nobody added gives a claim that is never current.
   */
  public claim(key: string): RunAllClaim {
    const slot: Slot = this.slots.get(key) ?? { settled: false };
    const holds = (): boolean => this.slots.get(key) === slot;
    const settle = (): void => {
      slot.settled = true;
    };
    const release = (): void => {
      const isHeld = holds();

      if (isHeld) this.slots.delete(key);
    };
    const expire = (): boolean => {
      const isHeld = holds();
      const isWaiting = isHeld && !slot.settled;

      if (isWaiting) this.slots.delete(key);

      return isWaiting;
    };
    const claim: RunAllClaim = { settle, expire, release };

    return claim;
  }

  /** The end of a task: frees its key when root, id and affected all match; any other task changes nothing. */
  public releaseOn(definition: RunAllDefinition): void {
    this.slots.delete(runAllKeyOf(definition));
  }
}

/** The state to list tasks of: none once the root has gone. */
const loadedStates = (state: RootState | undefined): RootState[] => {
  if (state === undefined) return [];

  return [state];
};

const statesOf = (roots: Roots): RootState[] => roots.all().map((entry) => entry.state);

/** The root to run in: the only one, else the pick; `null` when the pick is closed. */
const pickRoot = async (states: RootState[], ports: RunAllPorts): Promise<string | null> => {
  const [only] = states;

  if (states.length === 1 && only !== undefined) return only.folder.root;

  const picked = await ports.pick(rootItems(states), ROOT_PLACEHOLDER);

  return picked?.root ?? null;
};

/** The execution of `launch`, or `null` once the reason is logged: a binary that cannot run, a bad name or a rejected launch. */
const start = async (ports: RunAllPorts, launch: RunAllLaunch): Promise<Terminable | null> => {
  try {
    const canExecute = await ports.canExecute(launch.binaryPath);

    if (!canExecute) {
      ports.log(logTextOf(`turbo binary missing or not executable: ${launch.binaryPath}`));

      return null;
    }

    const args = turboRunAllArgs(launch.taskName, { affected: launch.affected });

    return await ports.execute(launch, args);
  } catch (error) {
    ports.log(logTextOf(error));

    return null;
  }
};

const launchAll = async (guard: RunAllGuard, ports: RunAllPorts, launch: RunAllLaunch): Promise<void> => {
  const key = runAllKey(launch.root, launch.taskName, launch.affected);
  const isAdded = guard.tryAdd(key);

  if (!isAdded) {
    ports.info(ALREADY_RUNNING_TEXT);

    return;
  }

  const claim = guard.claim(key);

  // VS Code would ask the user about a task that is already active; one it started itself (Rerun Last Task) has no key.
  const isActiveElsewhere = ports.isActive(key);

  if (isActiveElsewhere) {
    claim.release();
    ports.info(ALREADY_RUNNING_TEXT);
    ports.log(logTextOf(`${launch.taskName} in ${launch.root} is already running as a VS Code task`));

    return;
  }

  // Armed before the launch, so a launch that never settles cannot hold the key for good. A settled one is left to its
  // task end: VS Code may start the task only after a save prompt or an input, and drops a terminate sent before then.
  ports.after(START_TIMEOUT_MS, () => {
    const isExpired = claim.expire();

    if (isExpired) ports.log(logTextOf(startTimeoutText('turbo')));
  });

  const execution = await start(ports, launch);

  if (execution !== null) {
    claim.settle();

    return;
  }

  claim.release();
  ports.notifyFailedToStart();
};

/**
 * Spec §4.6.5: picks the root (only when there are several), loads it, picks a task name from its visible tasks and
 * launches `turbo run <task>` (with `--affected` on request) as a task of its own. A pick that is closed ends the flow.
 */
export const runAll = async (roots: Roots, guard: RunAllGuard, ports: RunAllPorts, request: RunAllRequest): Promise<void> => {
  const states = statesOf(roots);

  if (states.length === 0) {
    ports.info(NO_TASKS_TEXT);

    return;
  }

  const root = await pickRoot(states, ports);

  if (root === null) return;

  await ports.ensureLoaded(root);

  const state = roots.get(root)?.state;
  const loaded = loadedStates(state);
  const names = taskNameItems(loaded, false);
  const binary = state?.binary;

  if (names.length === 0 || binary === null || binary === undefined) {
    ports.info(NO_TASKS_TEXT);

    return;
  }

  const task = await ports.pick(names, TASK_PLACEHOLDER);

  if (task === undefined) return;

  const launch: RunAllLaunch = { root, binaryPath: binary.path, taskName: task.value, affected: request.affected };

  await launchAll(guard, ports, launch);
};
