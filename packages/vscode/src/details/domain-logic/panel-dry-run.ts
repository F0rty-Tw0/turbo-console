import type { DryRunRequest, DryRunState, WorkspaceModel } from '@turbo-console/core';

import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { DetailsPorts, DryRunResult } from '../common/details.type.ts';
import { dryRunRequestOf } from '../utils/dry-run-request.util.ts';

type DryRunStates = {
  readonly kind: 'states';
  readonly states: DryRunState[];
};

type DryRunFailure = {
  readonly kind: 'failed';
  readonly error: unknown;
};

/** How a dry run that was neither aborted nor superseded ended. */
type DryRunOutcome = DryRunStates | DryRunFailure;

const IDLE = Promise.resolve();
const LOADING: DryRunResult = { phase: 'loading', states: [] };
const READY: DryRunResult = { phase: 'ready', states: [] };
const FAILED: DryRunResult = { phase: 'failed', states: [] };

const toStates = (states: DryRunState[]): DryRunOutcome => {
  const outcome: DryRunOutcome = { kind: 'states', states };

  return outcome;
};

const toFailure = (error: unknown): DryRunOutcome => {
  const outcome: DryRunOutcome = { kind: 'failed', error };

  return outcome;
};

/**
 * Spec §4.4 steps 3, 5 and 8: the dry run of one panel's package, at most one live. `restart` aborts the live run; only
 * a run still live when it ends sets the result and calls `changed`, so a superseded result is dropped and a host
 * abort, which the port rejects as `failed`, never reads as a failure. Every run's rejection is handled here, and a throw
 * while one settles, `changed` included, is logged.
 */
export class PanelDryRun {
  private readonly packageName: string;
  private readonly ports: DetailsPorts;
  private readonly changed: () => void;
  private live: AbortController | null = null;
  private settled: Promise<void> = IDLE;
  private current: DryRunResult = LOADING;
  private deferred = false;

  public constructor(packageName: string, ports: DetailsPorts, changed: () => void) {
    this.packageName = packageName;
    this.ports = ports;
    this.changed = changed;
  }

  public get result(): DryRunResult {
    return this.current;
  }

  /** Whether a model change while hidden left the next dry run to the next show. */
  public get isDeferred(): boolean {
    return this.deferred;
  }

  /** A package with no task to resolve, or gone from `model`, gets the ready result and starts nothing. */
  public restart(model: WorkspaceModel | null): void {
    const request = dryRunRequestOf(model, this.packageName);

    this.abort();
    this.deferred = false;
    this.current = request === null ? READY : LOADING;

    if (request !== null) this.launch(request);
  }

  public defer(): void {
    this.abort();
    this.current = LOADING;
    this.deferred = true;
  }

  /** An aborted run changes nothing once it ends, so the panel is idle at once. */
  public abort(): void {
    this.live?.abort();
    this.live = null;
    this.settled = IDLE;
  }

  /** Resolves once no run is live, waiting also for a run that supersedes the one awaited. */
  public async whenIdle(): Promise<void> {
    const settled = this.settled;

    await settled;

    if (settled !== this.settled) await this.whenIdle();
  }

  private launch(request: DryRunRequest): void {
    const controller = new AbortController();
    const take = (outcome: DryRunOutcome): void => {
      if (this.live !== controller) return;

      this.live = null;
      this.settle(outcome);
    };
    const running = async (): Promise<DryRunState[]> => this.ports.dryRun(request, controller.signal);
    const logged = (error: unknown): void => {
      this.ports.log(logTextOf(error));
    };

    this.live = controller;

    const taken = running().then(toStates, toFailure).then(take);

    this.settled = taken.catch(logged);
  }

  /** Spec §4.5: a failure keeps the model fields and goes to the output channel. */
  private settle(outcome: DryRunOutcome): void {
    if (outcome.kind === 'failed') {
      this.ports.log(logTextOf(outcome.error));
      this.current = FAILED;
    } else {
      this.current = { phase: 'ready', states: outcome.states };
    }

    this.changed();
  }
}
