import type { DetailsState, RefreshMessage } from '@turbo-console/webview-ui';

import { DetailsStatePoster } from './details-state-poster.ts';
import { PanelDryRun } from './panel-dry-run.ts';
import { PanelTitle } from './panel-title.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import type { Runs } from '../../run/common/run.type.ts';
import { droppedMessageText } from '../../shared/utils/dropped-message.util.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { CommandMessage, DetailsPorts, DryRunResult, PanelKey, PosterGate } from '../common/details.type.ts';
import { commandOf } from '../utils/details-command.util.ts';
import { cardTaskIdsOf, checkedTaskMessage, parseWebviewMessage, refusedRunTextOf } from '../utils/details-message.util.ts';

/**
 * The host side of one Package Details panel. Every state is built from the store, the runs and the dry run
 * when it can be posted or a task message is checked. Nothing is posted before the page's `ready` or while hidden. A model change
 * while hidden aborts the dry run and defers the next one to the next show, which waits for the root's next store event
 * while the root has a skipped reload pending.
 */
export class DetailsSession {
  private readonly key: PanelKey;
  private readonly roots: Roots;
  private readonly runs: Runs;
  private readonly ports: DetailsPorts;
  private readonly dryRun: PanelDryRun;
  private readonly poster: DetailsStatePoster;
  private readonly title: PanelTitle;
  private readonly unsubscribes: (() => void)[] = [];
  /** `false` until `start`: the panel has no state, so every task message is dropped. */
  private isStarted = false;
  private isVisible = false;
  private isReady = false;
  private isDisposed = false;

  public constructor(key: PanelKey, roots: Roots, runs: Runs, ports: DetailsPorts) {
    this.key = key;
    this.roots = roots;
    this.runs = runs;
    this.ports = ports;
    this.title = new PanelTitle(key.packageName, ports.setTitle);
    this.dryRun = new PanelDryRun(key.packageName, ports, () => {
      this.publish();
    });

    const gate: PosterGate = { isStarted: () => this.isStarted, canPost: () => this.canPost() };
    const dryRunResult = (): DryRunResult => this.dryRun.result;
    const lastLabel = (): string | null => this.title.lastLabel;

    this.poster = new DetailsStatePoster({ key, roots, runs, ports, gate, dryRun: dryRunResult, lastLabel });
  }

  /** Subscribes and builds the first state. The caller awaits the root's load first, so the cache-first publish starts no dry run. */
  public start(): void {
    if (this.isDisposed) return;

    const offRoots = this.roots.onDidChange((change) => {
      this.rootChanged(change);
    });
    const offRuns = this.runs.onDidChange((entry) => {
      this.poster.runChanged(entry);
    });

    this.unsubscribes.push(offRoots, offRuns);
    this.poster.seed();
    this.isStarted = true;
    this.modelChanged();
  }

  /** The webview is a trust boundary: a message passes the schema first; a task message is then checked against the task ids of the state built now. */
  public async receive(value: unknown): Promise<void> {
    if (this.isDisposed) return;

    const parsed = parseWebviewMessage(value);
    const state = this.poster.stateFor(parsed);
    const taskIds = cardTaskIdsOf(state);
    const message = checkedTaskMessage(parsed, taskIds);

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

  /** Hiding resets `ready`: the page is rebuilt on show, and its new `ready` can arrive before this show does. */
  public setVisible(visible: boolean): void {
    if (this.isDisposed || visible === this.isVisible) return;

    this.isVisible = visible;
    this.isReady &&= visible;
    this.ports.setPanelVisible(visible);

    const isPendingShow = visible && this.dryRun.isDeferred;
    const isStale = this.ports.isStale(this.key.root);

    if (isPendingShow && !isStale) this.restartDryRun();
    else this.publish();
  }

  public async whenIdle(): Promise<void> {
    await this.dryRun.whenIdle();
  }

  /** Posts the current state when the panel is shown and its page is ready; a disposed panel posts nothing. */
  public publish(): void {
    if (this.isDisposed) return;

    this.poster.publish();
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

  private modelChanged(): void {
    this.title.sync(this.roots.get(this.key.root)?.state.model);

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

  /** A Run the panel refuses (binary failed, or a hidden script's live card) shows its text and launches nothing. */
  private async command(message: CommandMessage, state: DetailsState | null): Promise<void> {
    const isBinaryFailed = this.roots.get(this.key.root)?.state.error?.stage === 'binary';
    const refused = refusedRunTextOf(message, state, isBinaryFailed);

    if (refused !== null) {
      this.ports.info(refused);

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
}
