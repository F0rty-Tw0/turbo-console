import type {
  GraphAtomsMessage,
  GraphEdgeExplainedMessage,
  GraphEdgeImportsMessage,
  GraphHostMessage,
  GraphReady,
  GraphRunState,
  GraphRunsMessage,
  GraphShowPackageMessage,
  GraphShowTasksMessage,
  GraphTask
} from '@turbo-console/webview-ui';

import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

/** The graph states among what was posted to the panel of `root`, oldest first. */
export const graphStates = (api: TurboConsoleApi, root: string): GraphReady[] => {
  const posted = api.graph.posted(root);
  const states: GraphReady[] = [];

  for (const message of posted) {
    if (message.type === 'state' && message.state.kind === 'graph') states.push(message.state);
  }

  return states;
};

/** The newest graph state posted to the panel of `root`, `null` before there is one. */
export const lastGraphState = (api: TurboConsoleApi, root: string): GraphReady | null => {
  const states = graphStates(api, root);

  return states.at(-1) ?? null;
};

/** The two ends of the edge a request names: the dependent `source` and the dependency `target`. */
type EdgeEnds = { readonly source: string; readonly target: string };

type EdgeReply = GraphEdgeExplainedMessage | GraphEdgeImportsMessage;

export const isExplained = (message: GraphHostMessage): message is GraphEdgeExplainedMessage => message.type === 'edgeExplained';

export const isImports = (message: GraphHostMessage): message is GraphEdgeImportsMessage => message.type === 'edgeImports';

/** The newest reply of the kind `isKind` accepts to the request for `edge`, `null` before there is one. */
export const newestReplyFor = <Reply extends EdgeReply>(
  api: TurboConsoleApi,
  root: string,
  edge: EdgeEnds,
  isKind: (message: GraphHostMessage) => message is Reply
): Reply | null => {
  const posted = api.graph.posted(root);
  let newest: Reply | null = null;

  for (const message of posted) {
    const isReply = isKind(message) && message.source === edge.source && message.target === edge.target;

    if (isReply) newest = message;
  }

  return newest;
};

/** The newest `showTasks` request posted to the panel of `root`, `null` before there is one. */
export const postedShowTasks = (api: TurboConsoleApi, root: string): GraphShowTasksMessage | null => {
  const posted = api.graph.posted(root);
  let newest: GraphShowTasksMessage | null = null;

  for (const message of posted) {
    if (message.type === 'showTasks') newest = message;
  }

  return newest;
};

/** The `showPackage` requests posted to the panel of `root`, oldest first. */
export const postedShowPackages = (api: TurboConsoleApi, root: string): GraphShowPackageMessage[] => {
  const posted = api.graph.posted(root);
  const requests: GraphShowPackageMessage[] = [];

  for (const message of posted) {
    if (message.type === 'showPackage') requests.push(message);
  }

  return requests;
};

/** The `runs` maps posted to the panel of `root`, oldest first. */
export const postedRuns = (api: TurboConsoleApi, root: string): GraphRunsMessage[] => {
  const posted = api.graph.posted(root);
  const maps: GraphRunsMessage[] = [];

  for (const message of posted) {
    if (message.type === 'runs') maps.push(message);
  }

  return maps;
};

/** The newest `runs` map posted to the panel of `root`, `undefined` before there is one; a mark for `postedRunsAfter`. */
export const lastPostedRuns = (api: TurboConsoleApi, root: string): GraphRunsMessage | undefined => postedRuns(api, root).at(-1);

/**
 * The `runs` maps posted after `mark`, oldest first. The panel keeps only its last messages, so a mark is found by identity,
 * not by count: every map is newer when `mark` is `undefined` or has been dropped.
 */
export const postedRunsAfter = (api: TurboConsoleApi, root: string, mark: GraphRunsMessage | undefined): GraphRunsMessage[] => {
  const maps = postedRuns(api, root);
  const isMark = (message: GraphRunsMessage): boolean => message === mark;
  const found = maps.findIndex(isMark);

  return maps.slice(found + 1);
};

/** The `atoms` posts to the panel of `root`, oldest first. */
export const postedAtoms = (api: TurboConsoleApi, root: string): GraphAtomsMessage[] => {
  const posted = api.graph.posted(root);
  const messages: GraphAtomsMessage[] = [];

  for (const message of posted) {
    if (message.type === 'atoms') messages.push(message);
  }

  return messages;
};

/** The run states `id` went through in the `runs` maps posted to the panel of `root`, oldest first; a map without `id` adds none. */
export const runStatesOf = (api: TurboConsoleApi, root: string, id: string): GraphRunState[] => {
  const states: GraphRunState[] = [];

  for (const message of postedRuns(api, root)) {
    const state = message.runs[id];

    if (state !== undefined) states.push(state);
  }

  return states;
};

/** The sorted ids of the tasks a picker pools in `state`: every turbo task, plus the scripts while the state shows them; none before there is a state. */
export const pooledIdsOf = (state: GraphReady | null): string[] => {
  const isPooled = (task: GraphTask): boolean => task.isTurboTask || state?.scriptsShown === true;
  const tasks = state?.tasks ?? [];
  const ids = tasks.filter(isPooled).map((task): string => task.id);

  return ids.toSorted();
};
