import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import type { PackageGraphHostState } from '../common/graph.type.ts';

/** The graph states among what was posted to the panel of `root`, oldest first. */
export const graphStates = (api: TurboConsoleApi, root: string): PackageGraphHostState[] => {
  const posted = api.graph.posted(root);
  const states: PackageGraphHostState[] = [];

  for (const message of posted) {
    if (message.state.kind === 'graph') states.push(message.state);
  }

  return states;
};

/** The newest graph state posted to the panel of `root`, `null` before there is one. */
export const lastGraphState = (api: TurboConsoleApi, root: string): PackageGraphHostState | null => {
  const states = graphStates(api, root);

  return states.at(-1) ?? null;
};
