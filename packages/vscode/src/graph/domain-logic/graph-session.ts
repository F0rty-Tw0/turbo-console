import type { GraphPackage, GraphState, GraphWebviewMessage, Positions } from '@turbo-console/webview-ui';

import { answerRequest } from './graph-explain.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphLayoutCacheEntry } from '../common/graph-cache.type.ts';
import type { ExplainContext, ExplainRequest, GraphPorts } from '../common/graph.type.ts';
import { acceptedPositions } from '../utils/graph-cache.util.ts';
import { droppedGraphText, parseGraphMessage } from '../utils/graph-message.util.ts';
import { packageNamesOf } from '../utils/graph-package.util.ts';
import { graphStateOfRoot } from '../utils/graph-state.util.ts';

const NO_PACKAGES: GraphPackage[] = [];

/**
 * The host side of one Package Graph panel. Each state is built from the store and the layout cache when it is posted
 * or a message is checked, so a message is always judged against the graph as it is now. Nothing is posted before the
 * page's `ready` or while hidden; hiding resets `ready` because the page is rebuilt on show. An edge explanation is posted only if the panel is still shown and ready after its read.
 */
export class GraphSession {
  private readonly root: string;
  private readonly roots: Roots;
  private readonly ports: GraphPorts;
  private readonly unsubscribes: (() => void)[] = [];
  private isVisible = false;
  private isReady = false;
  private isDisposed = false;

  public constructor(root: string, roots: Roots, ports: GraphPorts) {
    this.root = root;
    this.roots = roots;
    this.ports = ports;
  }

  public start(): void {
    if (this.isDisposed) return;

    const offRoots = this.roots.onDidChange((change) => {
      this.rootChanged(change);
    });

    this.unsubscribes.push(offRoots);
  }

  /** The webview is a trust boundary: a message passes the schema first, then is checked against the state built now. */
  public async receive(value: unknown): Promise<void> {
    if (this.isDisposed) return;

    const message = parseGraphMessage(value);

    if (message === null) {
      this.drop(value);

      return;
    }

    await this.handle(message, value);
  }

  public setVisible(visible: boolean): void {
    if (this.isDisposed || visible === this.isVisible) return;

    this.isVisible = visible;
    this.isReady &&= visible;
    this.ports.setPanelVisible(visible);
    this.publish();
  }

  /** Reports the panel hidden once when it last reported it shown. */
  public dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;

    for (const unsubscribe of this.unsubscribes) unsubscribe();

    if (this.isVisible) this.ports.setPanelVisible(false);
  }

  /** Posts the current state when the panel is shown and its page is ready. */
  private publish(): void {
    const canPost = !this.isDisposed && this.isVisible && this.isReady;

    if (!canPost) return;

    const state = this.stateNow();

    this.ports.post({ type: 'state', state });
  }

  private stateNow(): GraphState {
    const cache = this.ports.readCache(this.root);
    const rootState = this.roots.get(this.root)?.state;

    return graphStateOfRoot(rootState, cache);
  }

  private rootChanged(change: RootChange): void {
    if (change.root !== this.root) return;

    const isNewModel = change.after !== change.before;
    const isNewError = change.errorAfter !== change.errorBefore;

    if (isNewModel || isNewError) this.publish();
  }

  private async handle(message: GraphWebviewMessage, value: unknown): Promise<void> {
    switch (message.type) {
      case 'ready':
        this.isReady = true;
        this.publish();

        return;
      case 'reload':
        this.reload(value);

        return;
      case 'openDetails':
        await this.openDetails(message.packageName, value);

        return;
      case 'positions':
        this.storePositions(message.hash, message.positions, value);

        return;
      case 'layoutDone':
        this.ports.info(`graph layout ${message.engine} ${message.ms} ms`);

        return;
      case 'explainEdge':
      case 'openManifest':
        await this.inspect(message, value);

        return;
    }
  }

  /** The page shows Reload only on an error state, so a `reload` at any other time is dropped and never reloads the root. */
  private reload(value: unknown): void {
    const state = this.stateNow();
    const isError = state.kind === 'error';

    if (!isError) {
      this.drop(value);

      return;
    }

    this.roots.get(this.root)?.coordinator.request('refresh');
  }

  private async openDetails(packageName: string, value: unknown): Promise<void> {
    const state = this.stateNow();
    const listed = state.kind === 'graph' ? state.packages : NO_PACKAGES;
    const names = packageNamesOf(listed);
    const isListed = names.includes(packageName);

    if (!isListed) {
      this.drop(value);

      return;
    }

    try {
      await this.ports.openDetails(packageName);
    } catch (error: unknown) {
      this.ports.log(logTextOf(error));
    }
  }

  private async inspect(request: ExplainRequest, value: unknown): Promise<void> {
    const state = this.stateNow();
    const canPost = (): boolean => !this.isDisposed && this.isVisible && this.isReady;
    const context: ExplainContext = { state, root: this.root, ports: this.ports, canPost };
    const isHandled = await answerRequest(request, context);

    if (!isHandled) this.drop(value);
  }

  private storePositions(hash: string, positions: Positions, value: unknown): void {
    const state = this.stateNow();
    const accepted = acceptedPositions(state, { hash, positions });

    if (accepted === null) {
      this.drop(value);

      return;
    }

    const entry: GraphLayoutCacheEntry = { hash, positions: accepted };

    this.ports.writeCache(this.root, entry);
  }

  private drop(value: unknown): void {
    const dropped = droppedGraphText(value);

    this.ports.log(logTextOf(`Dropped a graph message: ${dropped}`));
  }
}
