import type { GraphWiring } from './graph/common/graph-panel.type.ts';
import type { DetailsApi, TickerApi, TurboConsoleApi } from './shared/common/api.type.ts';

/** A part that hands out its API on demand, as the details panels and the ticker do. */
type ApiSource<T> = {
  readonly api: () => T;
};

/** The readers of the Packages view's live state, as `TreeVisibility` has them. */
type ViewReads = {
  readonly read: () => boolean;
  readonly description: () => string;
};

/** What `activate` built that the API reads. Each member is the live object, so the API never holds a copy. */
type ApiParts = {
  readonly tree: TurboConsoleApi['tree'];
  readonly commands: TurboConsoleApi['commands'];
  readonly help: TurboConsoleApi['help'];
  readonly timings: TurboConsoleApi['timings'];
  readonly session: Pick<TurboConsoleApi, 'loads' | 'whenIdle'>;
  readonly runSession: Pick<TurboConsoleApi, 'runs' | 'progress'>;
  readonly panels: ApiSource<DetailsApi>;
  readonly graph: Pick<GraphWiring, 'api'>;
  readonly visibility: ViewReads;
  readonly ticker: ApiSource<TickerApi>;
};

/** The API `activate` returns to integration tests. It sits beside `extension.ts` for the same reason: it joins every layer. */
export const apiOf = (parts: ApiParts): TurboConsoleApi => {
  const { session, runSession, panels, graph, visibility, ticker } = parts;
  const api: TurboConsoleApi = {
    tree: parts.tree,
    commands: parts.commands,
    help: parts.help,
    runs: runSession.runs,
    progress: runSession.progress,
    timings: parts.timings,
    loads: session.loads,
    whenIdle: async (root: string): Promise<void> => session.whenIdle(root),
    details: panels.api(),
    graph: graph.api,
    treeVisible: visibility.read,
    treeDescription: visibility.description,
    ticker: ticker.api()
  };

  return api;
};
