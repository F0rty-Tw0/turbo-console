import type { DetailsState, HostMessage, RefreshMessage } from '@turbo-console/webview-ui';

import { PanelDryRun } from './panel-dry-run.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { RunEntry, Runs } from '../../run/common/run.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { CommandMessage, DetailsInput, DetailsPorts, PanelKey } from '../common/details.type.ts';
import { commandOf } from '../utils/details-command.util.ts';
import { droppedMessageText, parseWebviewMessage, taskIdsOf } from '../utils/details-message.util.ts';
import { toDetailsState } from '../utils/details-state.util.ts';
import { toRunView } from '../utils/run-view.util.ts';

/**
 * Spec §4.4, the host side of one Package Details panel. Every state is built from the store, the runs and the dry run
 * when it is sent or a message is checked. Nothing is posted before the page's `ready` or while hidden. A model change
 * while hidden aborts the dry run and defers the next one to the next show, which waits for the root's next store event
 * while the root has a skipped reload pending.
 */
export class DetailsSession {
  private readonly key: PanelKey;
  private readonly roots: Roots;
  private readonly runs: Runs;
  private readonly ports: DetailsPorts;
  private readonly dryRun: PanelDryRun;
  private readonly unsubscribes: (() => void)[] = [];
  /** `false` until `start` has seen the root loaded: the panel has no state, so every task message is dropped. */
  private isStarted = false;
  private isVisible = false;
  private isReady = false;
  private isDisposed = false;

  public constructor(key: PanelKey, roots: Roots, runs: Runs, ports: DetailsPorts) {
    this.key = key;
    this.roots = roots;
    this.runs = runs;
    this.ports = ports;
    this.dryRun = new PanelDryRun(key.packageName, ports, () => {
      this.publish();
    });
  }

  /** Subscribes only once the root has loaded, so the cache-first publish and that load start no dry run of their own. */
  public async start(): Promise<void> {
    await this.ports.ensureLoaded(this.key.root);

    if (this.isDisposed) return;

    const offRoots = this.roots.onDidChange((change) => {
      this.rootChanged(change);
    });
    const offRuns = this.runs.onDidChange((entry) => {
      this.runChanged(entry);
    });

    this.unsubscribes.push(offRoots, offRuns);
    this.isStarted = true;
    this.modelChanged();
  }

  /** The webview is a trust boundary: a message is checked against the task ids of the state built now. */
  public async receive(value: unknown): Promise<void> {
    if (this.isDisposed) return;

    const state = this.state();
    const taskIds = taskIdsOf(state);
    const message = parseWebviewMessage(value, taskIds);

    if (message === null) {
      const dropped = droppedMessageText(value);

      this.ports.log(logTextOf(`Dropped a webview message: ${dropped}`));

      return;
    }

    if (message.type === 'ready') {
      this.isReady = true;
      this.publish();

      return;
    }

    if (message.type === 'refresh') {
      this.refresh(message.scope);

      return;
    }

    await this.command(message, state);
  }

  /** Every change resets `ready`: the page is rebuilt on show and sends a new one. */
  public setVisible(visible: boolean): void {
    if (this.isDisposed || visible === this.isVisible) return;

    this.isVisible = visible;
    this.isReady = false;
    this.ports.setPanelVisible(visible);

    const isPendingShow = visible && this.dryRun.isDeferred;

    if (!isPendingShow) return;

    const isStale = this.ports.isStale(this.key.root);

    if (!isStale) this.restartDryRun();
  }

  public async whenIdle(): Promise<void> {
    await this.dryRun.whenIdle();
  }

  /** Reports the panel hidden once when it last reported it shown; a second call does nothing. */
  public dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.dryRun.abort();

    for (const unsubscribe of this.unsubscribes) unsubscribe();

    if (this.isVisible) this.ports.setPanelVisible(false);
  }

  /** A new model object, or an event while a deferred dry run waits on a shown panel, which runs it on the kept model. */
  private rootChanged(change: RootChange): void {
    if (change.root !== this.key.root) return;

    const isNewModel = change.after !== null && change.after !== change.before;
    const isDeferredShow = this.dryRun.isDeferred && this.isVisible;

    if (isNewModel || isDeferredShow) {
      this.modelChanged();

      return;
    }

    this.publish();
  }

  private runChanged(entry: RunEntry): void {
    const isOwn = entry.root === this.key.root && entry.packageName === this.key.packageName;

    if (!isOwn || !this.canPost()) return;

    const run = toRunView(entry);
    const message: HostMessage = { type: 'runState', taskId: entry.taskId, run };

    this.ports.post(message);
  }

  private modelChanged(): void {
    if (this.isVisible) {
      this.restartDryRun();

      return;
    }

    this.dryRun.defer();
  }

  private restartDryRun(): void {
    const model = this.roots.get(this.key.root)?.state.model ?? null;

    this.dryRun.restart(model);
    this.publish();
  }

  private refresh(scope: RefreshMessage['scope']): void {
    if (scope === 'root') {
      this.roots.get(this.key.root)?.coordinator.request('refresh');

      return;
    }

    if (this.isStarted) this.modelChanged();
  }

  /** Spec §4.1: while the root's binary failed, Run shows the banner's binary text and launches nothing. */
  private async command(message: CommandMessage, state: DetailsState | null): Promise<void> {
    const stage = this.roots.get(this.key.root)?.state.error?.stage;
    const isBlockedRun = message.type === 'run' && stage === 'binary' && state?.kind === 'package';

    if (isBlockedRun && state.reloadError !== null) {
      this.ports.info(state.reloadError);

      return;
    }

    const { command, arg } = commandOf(message, this.key);

    try {
      await this.ports.execute(command, arg);
    } catch (error: unknown) {
      this.ports.log(logTextOf(error));
    }
  }

  private canPost(): boolean {
    return this.isVisible && this.isReady;
  }

  private publish(): void {
    const state = this.state();

    if (!this.canPost() || state === null) return;

    const message: HostMessage = { type: 'state', state };

    this.ports.post(message);
  }

  private state(): DetailsState | null {
    const entry = this.roots.get(this.key.root);

    if (!this.isStarted || entry === undefined) return null;

    const input: DetailsInput = { ...this.key, state: entry.state, dryRun: this.dryRun.result, runs: this.runs.get };

    return toDetailsState(input);
  }
}
