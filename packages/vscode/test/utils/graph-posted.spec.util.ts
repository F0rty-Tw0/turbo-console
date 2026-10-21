import type { GraphReady } from '@turbo-console/webview-ui';

import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';

/** The graph states among what was posted to the panel of `root`, oldest first. */
export const graphStates = (api: TurboConsoleApi, root: string): GraphReady[] => {
  const posted = api.graph.posted(root);
  const states: GraphReady[] = [];

  for (const message of posted) {
    if (message.state.kind === 'graph') states.push(message.state);
  }

  return states;
};

/** The newest graph state posted to the panel of `root`, `null` before there is one. */
export const lastGraphState = (api: TurboConsoleApi, root: string): GraphReady | null => {
  const states = graphStates(api, root);

  return states.at(-1) ?? null;
};
