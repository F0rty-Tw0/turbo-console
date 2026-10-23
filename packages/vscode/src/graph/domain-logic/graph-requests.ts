import type { GraphPackage, GraphState, GraphWebviewMessage } from '@turbo-console/webview-ui';

import { routeRun } from './graph-run-route.ts';
import type { Coordinator } from '../../roots/common/coordinator.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphPorts, GraphRequestMessage, RequestContext } from '../common/graph.type.ts';
import { packageNamesOf } from '../utils/graph-package.util.ts';

const NO_PACKAGES: GraphPackage[] = [];

const REQUEST_TYPES: Readonly<Record<GraphRequestMessage['type'], true>> = {
  reload: true,
  openDetails: true,
  runTask: true,
  stopTask: true
};

export function isRequestMessage(message: GraphWebviewMessage): message is GraphRequestMessage {
  return Object.hasOwn(REQUEST_TYPES, message.type);
}

/** The page shows Reload only on an error state, so a `reload` at any other time is not honoured and never reloads the root. */
function reloadOf(state: GraphState, coordinator: Pick<Coordinator, 'request'> | undefined): boolean {
  const isError = state.kind === 'error';

  if (!isError) return false;

  coordinator?.request('refresh');

  return true;
}

/** `false` when the package is not listed; a rejection of the port is logged and the request still counts as handled. */
async function openDetailsOf(
  packageName: string,
  state: GraphState,
  ports: Pick<GraphPorts, 'openDetails' | 'log'>
): Promise<boolean> {
  const listed = state.kind === 'graph' ? state.packages : NO_PACKAGES;
  const names = packageNamesOf(listed);
  const isListed = names.includes(packageName);

  if (!isListed) return false;

  try {
    await ports.openDetails(packageName);
  } catch (error: unknown) {
    ports.log(logTextOf(error));
  }

  return true;
}

/** `false` when the page asked for something the state does not allow; the session logs and drops that message. */
export async function requestHandledOf(message: GraphRequestMessage, context: RequestContext): Promise<boolean> {
  const { state, root, coordinator, ports } = context;

  switch (message.type) {
    case 'reload':
      return reloadOf(state, coordinator);
    case 'openDetails':
      return openDetailsOf(message.packageName, state, ports);
    case 'runTask':
    case 'stopTask':
      return routeRun(message, state, ports, root);
  }
}
