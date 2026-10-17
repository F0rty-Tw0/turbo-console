import { finishRun, runTask, taskEnded } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { RunTiming } from '../../shared/common/api.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { NOT_FOUND_CODES, RUN_TIMINGS_MAX } from '../common/run.const.ts';
import type { RunControl, RunDefinition, RunEntry, RunEvent, RunKey, RunPorts, RunRequest } from '../common/run.type.ts';
import { runKeyOf } from '../utils/run-entry.util.ts';
import { taskIdsOf } from '../utils/run-target.util.ts';
import { notFoundText } from '../utils/run-text.util.ts';

/**
 * The runs of the window and what drives them: the run commands and the task events of runs this window launched. Each
 * event carries its run's launch token, so an event of an earlier run of the task never changes the current one. Every
 * run gets one entry in `timings` (the newest `RUN_TIMINGS_MAX`), its launch and its process start, for the integration
 * tests.
 */
export class RunSession implements RunControl {
  public readonly runs = new RunStore();
  private readonly ports: RunPorts;
  private readonly timings: RunTiming[];
  /** The launch token of each run whose process ended and whose task end has not arrived yet. */
  private readonly endingRuns = new Map<RunKey, number>();

  public constructor(ports: RunPorts, timings: RunTiming[]) {
    this.ports = ports;
    this.timings = timings;
    this.runs.onDidChange((entry) => {
      this.record(entry);
    });
  }

  public async run(request: RunRequest): Promise<void> {
    const ports: RunPorts = { ...this.ports, isActive: (definition) => this.isActive(definition) };

    await runTask(this.runs, ports, request);
  }

  public stop(definition: RunDefinition): void {
    this.runs.requestStop(definition);
  }

  public processStarted(event: RunEvent): void {
    this.runs.processStarted(event.definition, this.ports.now(), event.launchedAt);
  }

  /** Spec §4.5 step 6: a failure while settling the match (a throwing change listener) is logged, never thrown. */
  public processEnded(event: RunEvent, exitCode: number | undefined): void {
    const ended = this.runs.processEnded(event.definition, exitCode, this.ports.now(), event.launchedAt);

    if (ended === null) return;

    this.logNotFound(ended);

    const key = runKeyOf(ended.root, ended.taskId);

    this.endingRuns.set(key, ended.launchedAt);
    finishRun(this.runs, this.ports, ended).catch((error: unknown) => {
      this.ports.log(logTextOf(error));
    });
  }

  /** Spec 1c-b §4.4: a script ending 127 or 9009 gets one hedged Output line and no notice. */
  private logNotFound(ended: RunEntry): void {
    const { packageManager, exitCode } = ended;

    if (packageManager === null || exitCode === null) return;

    const isNotFound = NOT_FOUND_CODES.includes(exitCode);

    if (!isNotFound) return;

    this.ports.log(logTextOf(notFoundText(packageManager, exitCode)));
  }

  public taskEnded(event: RunEvent): void {
    const key = runKeyOf(event.definition.root, event.definition.id);
    const endingLaunch = this.endingRuns.get(key);
    const isEndingRun = endingLaunch === event.launchedAt;

    if (isEndingRun) this.endingRuns.delete(key);

    taskEnded(this.runs, this.ports, event.definition, event.launchedAt);
  }

  /** Drops the ended runs of tasks the root no longer has; a root with no model keeps none. */
  public rootChanged(change: RootChange): void {
    const visibleIds = taskIdsOf(change.after);

    this.runs.prune(change.root, visibleIds);
  }

  /**
   * Whether VS Code runs a task of `definition`, except a run of this window whose process ended: VS Code drops it from
   * its active tasks before it fires the process end, but `taskExecutions` lists it until the task end, a later event.
   * Safe only because VS Code (1.141) sends the task end before it answers the next `executeTask`: every run of a task
   * shares one execution id, so a new run resolved earlier would get the ended run's execution.
   */
  private isActive(definition: RunDefinition): boolean {
    const key = runKeyOf(definition.root, definition.id);
    const isEnding = this.endingRuns.has(key);

    return !isEnding && this.ports.isActive(definition);
  }

  private record(entry: RunEntry): void {
    const timing: RunTiming = { taskId: entry.taskId, clickedAt: entry.launchedAt, processStartedAt: entry.processStartedAt };
    const index = this.timings.findLastIndex((known) => known.taskId === entry.taskId && known.clickedAt === entry.launchedAt);

    if (index === -1) {
      this.timings.push(timing);

      const isOverCap = this.timings.length > RUN_TIMINGS_MAX;

      if (isOverCap) this.timings.shift();

      return;
    }

    this.timings[index] = timing;
  }
}
