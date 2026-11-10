import type { GraphShowRequest, GraphState, GraphTask, GraphWebviewMessage } from '@turbo-console/webview-ui';

import { GraphImageSaver } from './graph-image-saver.ts';
import { layoutCachesOf, storePositions } from './graph-layout-store.ts';
import { GraphLookups, isLookupMessage } from './graph-lookups.ts';
import { isRequestMessage, requestHandledOf } from './graph-requests.ts';
import { GraphTaskFeed } from './graph-task-feed.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphFeeds, GraphPorts, LookupGate, RequestContext, TaskFeedGate } from '../common/graph.type.ts';
import { droppedGraphText, parseGraphMessage } from '../utils/graph-message.util.ts';
import { graphStateOfRoot, persistentIdsOfRoot, runIdsOfRoot, shownOf, tasksOfRoot } from '../utils/graph-state.util.ts';

/**
 * The host side of one Package Graph panel. Each state is built from the store and the layout cache when it is posted
 * or a message is checked, so a message is always judged against the graph as it is now. Nothing is posted before the
 * page's `ready` or while hidden; hiding resets `ready` because the page is rebuilt on show. Every state post is followed
 * by the run states of its tasks, the Atomizer counts of its groups and a held `showTasks` or `showPackage`, through the
 * `GraphTaskFeed`. A change of either tree toggle posts the state again, under the same gate.
 * Edge explanations and manifest opens go to `GraphLookups`.
 */
export class GraphSession {
  private readonly root: string;
  private readonly roots: Roots;
  private readonly ports: GraphPorts;
  private readonly unsubscribes: (() => void)[] = [];
  private isVisible = false;
  private isReady = false;
  private isDisposed = false;
  private readonly images: GraphImageSaver;
  private readonly lookups: GraphLookups;
  private readonly feed: GraphTaskFeed;
  private readonly feeds: GraphFeeds;

  public constructor(root: string, roots: Roots, ports: GraphPorts, feeds: GraphFeeds) {
    this.root = root;
    this.roots = roots;
    this.ports = ports;
    this.feeds = feeds;
    this.images = new GraphImageSaver(root, ports);

    const lookupGate: LookupGate = {
      root,
      ports,
      state: (): GraphState => this.stateNow(),
      canPost: (): boolean => this.canPost(),
      drop: (value: unknown): void => {
        this.drop(value);
      }
    };

    this.lookups = new GraphLookups(lookupGate);

    const gate: TaskFeedGate = {
      canPost: (): boolean => this.canPost(),
      state: (): GraphState => this.stateNow(),
      runIds: (): string[] => runIdsOfRoot(this.roots.get(this.root)?.state),
      persistentIds: (): ReadonlySet<string> => persistentIdsOfRoot(this.roots.get(this.root)?.state),
      tasks: (): GraphTask[] => tasksOfRoot(this.roots.get(this.root)?.state)
    };

    this.feed = new GraphTaskFeed({ root, ports, gate, feeds });
  }

  public start(): void {
    if (this.isDisposed) return;

    const offRoots = this.roots.onDidChange((change) => {
      this.rootChanged(change);
    });

    const { scope, scripts, prediction } = this.feeds.toggles;
    const onToggle = (): void => {
      this.publish();
    };

    this.unsubscribes.push(offRoots, scope.onDidChange(onToggle), scripts.onDidChange(onToggle), prediction.onDidChange(onToggle));
    this.feed.start();
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

  /** Asks the page to show tasks or focus a package: at once when it can, else once it is ready; the latest request wins. */
  public show(request: GraphShowRequest): void {
    if (this.isDisposed) return;

    this.feed.show(request);
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

    this.feed.stop();
    this.lookups.dispose();

    if (this.isVisible) this.ports.setPanelVisible(false);
  }

  /**
   * Posts the current state, then its run states, its atom counts and any held `showTasks` or `showPackage`, when the panel
   * is shown and its page is ready.
   */
  private publish(): void {
    if (!this.canPost()) return;

    const state = this.stateNow();

    this.ports.post({ type: 'state', state });
    this.feed.flush(state);
  }

  private canPost(): boolean {
    return !this.isDisposed && this.isVisible && this.isReady;
  }

  private stateNow(): GraphState {
    const caches = layoutCachesOf(this.ports, this.root);
    const rootState = this.roots.get(this.root)?.state;

    return graphStateOfRoot(rootState, caches, shownOf(this.feeds.toggles));
  }

  private rootChanged(change: RootChange): void {
    if (change.root !== this.root) return;

    const isNewModel = change.after !== change.before;
    const isNewError = change.errorAfter !== change.errorBefore;

    if (isNewModel || isNewError) this.publish();
  }

  private async handle(message: GraphWebviewMessage, value: unknown): Promise<void> {
    if (isRequestMessage(message)) {
      const isHandled = await requestHandledOf(message, this.requestContext());

      if (!isHandled) this.drop(value);

      return;
    }

    if (isLookupMessage(message)) {
      await this.lookups.receive(message, value);

      return;
    }

    switch (message.type) {
      case 'ready':
        this.isReady = true;
        this.publish();

        return;
      case 'positions': {
        const isStored = storePositions(this.ports, this.root, this.stateNow(), message);

        if (!isStored) this.drop(value);

        return;
      }
      case 'layoutDone':
        this.ports.info(`graph layout ${message.engine} ${message.ms} ms`);

        return;
      case 'exportImage':
        await this.images.save(message.png);

        return;
    }
  }

  private requestContext(): RequestContext {
    const coordinator = this.roots.get(this.root)?.coordinator;
    const context: RequestContext = { state: this.stateNow(), root: this.root, coordinator, ports: this.ports, feeds: this.feeds };

    return context;
  }

  private drop(value: unknown): void {
    const dropped = droppedGraphText(value);

    this.ports.log(logTextOf(`Dropped a graph message: ${dropped}`));
  }
}
