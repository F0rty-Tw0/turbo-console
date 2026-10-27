import type {
  GraphAtomsMessage,
  GraphEdgeExplainedMessage,
  GraphReady,
  GraphRunsMessage,
  GraphShowPackageMessage,
  GraphShowTasksMessage
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

/** The newest `edgeExplained` reply to the `source` to `target` request, `null` before there is one. */
export const explainedFor = (api: TurboConsoleApi, root: string, source: string, target: string): GraphEdgeExplainedMessage | null => {
  const posted = api.graph.posted(root);
  let newest: GraphEdgeExplainedMessage | null = null;

  for (const message of posted) {
    const isReply = message.type === 'edgeExplained' && message.source === source && message.target === target;

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

/** The `atoms` posts to the panel of `root`, oldest first. */
export const postedAtoms = (api: TurboConsoleApi, root: string): GraphAtomsMessage[] => {
  const posted = api.graph.posted(root);
  const messages: GraphAtomsMessage[] = [];

  for (const message of posted) {
    if (message.type === 'atoms') messages.push(message);
  }

  return messages;
};
