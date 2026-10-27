import type { GraphShowRequest, GraphState, GraphWebviewMessage } from '@turbo-console/webview-ui';

import { answerRequest } from './graph-explain.ts';
import { GraphImageSaver } from './graph-image-saver.ts';
import { layoutCachesOf, storePositions } from './graph-layout-store.ts';
import { isRequestMessage, requestHandledOf } from './graph-requests.ts';
import { GraphTaskFeed } from './graph-task-feed.ts';
import { LatestWins } from './latest-wins.ts';
import type { RootChange, Roots } from '../../roots/common/coordinator.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { ExplainContext, ExplainRequest, GraphFeeds, GraphPorts, RequestContext, TaskFeedGate } from '../common/graph.type.ts';
import { droppedGraphText, parseGraphMessage } from '../utils/graph-message.util.ts';
import { graphStateOfRoot, runIdsOfRoot } from '../utils/graph-state.util.ts';

type ExplainJob = {
  readonly request: ExplainRequest;
  readonly value: unknown;
};

/**
 * The host side of one Package Graph panel. Each state is built from the store and the layout cache when it is posted
 * or a message is checked, so a message is always judged against the graph as it is now. Nothing is posted before the
 * page's `ready` or while hidden; hiding resets `ready` because the page is rebuilt on show. Every state post is followed
 * by the run states of its tasks, the Atomizer counts of its groups and a held `showTasks` or `showPackage`, through the
 * `GraphTaskFeed`. An edge explanation is posted only if the panel is still shown and ready after its read.
 * One `explainEdge` is answered at a time; the one waiting behind it is replaced by each newer request, so a page that floods them costs one read in flight and one waiting.
 */
export class GraphSession {
  private readonly root: string;
  private readonly roots: Roots;
  private readonly ports: GraphPorts;
  private readonly unsubscribes: (() => void)[] = [];
  private isVisible = false;
  private isReady = false;
  private isDisposed = false;
  private readonly explains = new LatestWins<ExplainJob>();
  private readonly images: GraphImageSaver;
  private readonly feed: GraphTaskFeed;
  private readonly atoms: GraphFeeds['atoms'];

  public constructor(root: string, roots: Roots, ports: GraphPorts, feeds: GraphFeeds) {
    this.root = root;
    this.roots = roots;
    this.ports = ports;
    this.atoms = feeds.atoms;
    this.images = new GraphImageSaver(root, ports);

    const gate: TaskFeedGate = {
      canPost: (): boolean => this.canPost(),
      state: (): GraphState => this.stateNow(),
      runIds: (): string[] => runIdsOfRoot(this.roots.get(this.root)?.state)
    };

    this.feed = new GraphTaskFeed({ root, runs: feeds.runs, ports, gate, atoms: feeds.atoms });
  }

  public start(): void {
    if (this.isDisposed) return;

    const offRoots = this.roots.onDidChange((change) => {
      this.rootChanged(change);
    });

    this.unsubscribes.push(offRoots);
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

    return graphStateOfRoot(rootState, caches);
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
      case 'explainEdge':
        await this.explains.run({ request: message, value }, async (job) => this.answer(job));

        return;
      case 'openManifest':
        await this.answer({ request: message, value });

        return;
      case 'exportImage':
        await this.images.save(message.png);

        return;
    }
  }

  private requestContext(): RequestContext {
    const coordinator = this.roots.get(this.root)?.coordinator;
    const context: RequestContext = { state: this.stateNow(), root: this.root, coordinator, ports: this.ports, atoms: this.atoms };

    return context;
  }

  private async answer(job: ExplainJob): Promise<void> {
    if (this.isDisposed) return;

    const { request, value } = job;
    const state = this.stateNow();
    const canPost = (): boolean => this.canPost();
    const context: ExplainContext = { state, root: this.root, ports: this.ports, canPost };
    const isHandled = await answerRequest(request, context);

    if (!isHandled) this.drop(value);
  }

  private drop(value: unknown): void {
    const dropped = droppedGraphText(value);

    this.ports.log(logTextOf(`Dropped a graph message: ${dropped}`));
  }
}
