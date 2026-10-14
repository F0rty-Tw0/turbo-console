import { finishRun, runTask, taskEnded } from './run-flow.ts';
import { RunStore } from './run-store.ts';
import type { RootChange } from '../../roots/common/coordinator.type.ts';
import type { RunTiming } from '../../shared/common/api.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import { RUN_TIMINGS_MAX } from '../common/run.const.ts';
import type { RunControl, RunDefinition, RunEntry, RunEvent, RunPorts, RunRequest } from '../common/run.type.ts';
import { taskIdsOf } from '../utils/run-target.util.ts';

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

  public constructor(ports: RunPorts, timings: RunTiming[]) {
    this.ports = ports;
    this.timings = timings;
    this.runs.onDidChange((entry) => {
      this.record(entry);
    });
  }

  public async run(request: RunRequest): Promise<void> {
    await runTask(this.runs, this.ports, request);
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

    finishRun(this.runs, this.ports, ended).catch((error: unknown) => {
      this.ports.log(logTextOf(error));
    });
  }

  public taskEnded(event: RunEvent): void {
    taskEnded(this.runs, this.ports, event.definition, event.launchedAt);
  }

  /** Drops the ended runs of tasks the root no longer has; a root with no model keeps none. */
  public rootChanged(change: RootChange): void {
    const visibleIds = taskIdsOf(change.after);

    this.runs.prune(change.root, visibleIds);
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
