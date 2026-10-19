import type { ChangeReason, Coordinator, CoordinatorPorts, LoadOutcome, LoadRecord } from '../common/coordinator.type.ts';
import type { LoadFailure, LoadMode, LoadResult, LoadedModel } from '../common/root.type.ts';
import { runFailureOf } from '../utils/run-failure.util.ts';

type Flight = {
  readonly generation: number;
  readonly controller: AbortController;
  readonly record: LoadRecord;
  readonly firstAnswer: PromiseWithResolvers<undefined>;
  readonly settled: PromiseWithResolvers<undefined>;
};

/** `loadRoot` returns a cached model only once its freshness check passed, so the result alone says whether it was fresh. */
const closeRecord = (record: LoadRecord, outcome: LoadOutcome, result: LoadResult): void => {
  const isCacheFirst = record.mode === 'cache-first';
  const isFreshCache = result.kind === 'model' && result.fromCache && result.isFresh;

  record.outcome = outcome;
  record.cacheFresh = isCacheFirst ? isFreshCache : null;
};

/**
 * Spec §4.3 coordinator of one root, with planning correction 4. At most one live load: `request` aborts it, everything
 * else joins it. Every load gets the next generation; its `publish` and result reach `ports.apply` only while it is the
 * latest load and its signal is not aborted. The stale flag holds the generation at which it was set, and only a load
 * of a higher generation that settles clears it, with a model or a failure (an aborted load never does). So `show` never
 * retries a failed reload: only a new change request, a refresh, or `ensureLoaded` (by its own rule) loads again.
 */
export class LoadCoordinator implements Coordinator {
  private readonly ports: CoordinatorPorts;
  private counter = 0;
  private current: Flight | null = null;
  private staleAt: number | null = null;
  private showPending = false;
  private everLoaded = false;
  private hasModel = false;
  private failedStage: LoadFailure['stage'] | null = null;
  private disposed = false;

  public constructor(ports: CoordinatorPorts) {
    this.ports = ports;
  }

  public request(reason: ChangeReason): void {
    this.current?.controller.abort();
    this.staleAt = this.counter;

    const isVisible = this.ports.isVisible();

    if (reason === 'refresh' || isVisible) this.start('full');
  }

  /** With a load in flight it starts nothing: the settle of that load starts the full load if the root is still stale. */
  public show(): void {
    if (this.current !== null) {
      this.showPending = true;

      return;
    }

    const mode = this.wantedMode();

    if (mode !== null) this.start(mode);
  }

  /** Waits only while the root has nothing to show yet: until the first publish or the settle of the load in flight. */
  public async firstChildren(): Promise<void> {
    this.show();

    const flight = this.current;

    if (flight === null || this.everLoaded) return;

    await flight.firstAnswer.promise;
  }

  /**
   * Never aborts. Starts at most one load of its own; retries a binary error, or a load error with no model, only when
   * nothing was in flight.
   */
  public async ensureLoaded(): Promise<void> {
    await this.ensure(true, true);
  }

  public async whenSettled(): Promise<void> {
    const flight = this.current;

    if (flight === null) return;

    await flight.settled.promise;
    await this.whenSettled();
  }

  public isStale(): boolean {
    return this.staleAt !== null;
  }

  public dispose(): void {
    this.disposed = true;
    this.current?.controller.abort();
  }

  private async ensure(canStart: boolean, canRetry: boolean): Promise<void> {
    const flight = this.current;

    if (flight !== null) {
      await flight.settled.promise;

      if (flight.controller.signal.aborted) await this.ensure(canStart, false);

      return;
    }

    const mode = this.ensureMode(canRetry);

    if (!canStart || mode === null) return;

    this.start(mode);
    await this.ensure(false, false);
  }

  private ensureMode(canRetry: boolean): LoadMode | null {
    const wanted = this.wantedMode();
    const isModelless = this.failedStage === 'load' && !this.hasModel;
    const isUnusable = this.failedStage === 'binary' || isModelless;

    if (wanted === null && canRetry && isUnusable) return 'full';

    return wanted;
  }

  private wantedMode(): LoadMode | null {
    if (this.staleAt !== null) return 'full';

    if (this.everLoaded) return null;

    return 'cache-first';
  }

  private start(mode: LoadMode): void {
    if (this.disposed) return;

    this.counter += 1;
    this.showPending = false;

    const controller = new AbortController();
    const record: LoadRecord = { mode, startedAt: this.ports.now(), outcome: null, cacheFresh: null };
    const firstAnswer = Promise.withResolvers<undefined>();
    const settled = Promise.withResolvers<undefined>();
    const flight: Flight = { generation: this.counter, controller, record, firstAnswer, settled };
    const publish = (result: LoadedModel): void => {
      firstAnswer.resolve(undefined);
      this.take(flight, result);
    };
    const settle = (result: LoadResult): void => {
      this.settle(flight, result);
    };

    const running = async (): Promise<LoadResult> => this.ports.run(mode, controller.signal, publish);

    this.current = flight;
    this.ports.record(record);
    void running().catch(runFailureOf).then(settle);
  }

  /**
   * A superseded flight is always aborted (`request` aborts `current` before it starts; every other start needs
   * `current === null`), so `ports.apply`, which logs failures, gets every failure that was not aborted.
   */
  private isLive(flight: Flight): boolean {
    const isLatest = flight.generation === this.counter;

    return isLatest && !flight.controller.signal.aborted;
  }

  private take(flight: Flight, result: LoadResult): void {
    const isLive = this.isLive(flight);

    if (!isLive) return;

    this.everLoaded = true;
    this.failedStage = result.kind === 'error' ? result.stage : null;
    this.hasModel ||= result.kind === 'model';
    this.ports.apply(result);
  }

  /**
   * Bookkeeping first, `apply` last: the follow-up and the settle waiters never depend on the port returning. A cached
   * result after a publish is still applied: the publish came before the binary resolved, and the result carries it.
   */
  private settle(flight: Flight, result: LoadResult): void {
    const isLive = this.isLive(flight);
    const outcome = isLive ? result.kind : 'aborted';
    const wasCurrent = this.current === flight;

    closeRecord(flight.record, outcome, result);

    if (wasCurrent) this.current = null;

    if (outcome !== 'aborted') this.clearStale(flight.generation);

    if (wasCurrent) this.followUp(flight.generation);

    flight.firstAnswer.resolve(undefined);
    flight.settled.resolve(undefined);

    this.take(flight, result);
  }

  private clearStale(generation: number): void {
    const isAfterFlag = this.staleAt !== null && generation > this.staleAt;

    if (isAfterFlag) this.staleAt = null;
  }

  private followUp(generation: number): void {
    const hadShow = this.showPending;
    const isStillStale = this.staleAt !== null && this.staleAt >= generation;

    this.showPending = false;

    if (!isStillStale) return;

    const isVisible = this.ports.isVisible();

    if (isVisible || hadShow) this.start('full');
  }
}
