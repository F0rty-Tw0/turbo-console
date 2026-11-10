import type { GraphPackage, GraphSetViewToggleMessage, GraphState, GraphWebviewMessage } from '@turbo-console/webview-ui';

import { routeRun } from './graph-run-route.ts';
import type { Coordinator } from '../../roots/common/coordinator.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { GraphFeeds, GraphPorts, GraphRequestMessage, GraphToggles, RequestContext } from '../common/graph.type.ts';
import { packageNamesOf } from '../utils/graph-package.util.ts';

const NO_PACKAGES: GraphPackage[] = [];

const REQUEST_TYPES: Readonly<Record<GraphRequestMessage['type'], true>> = {
  reload: true,
  openDetails: true,
  runTask: true,
  stopTask: true,
  shownUmbrellas: true,
  shownTaskPackages: true,
  setViewToggle: true
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

/** `false` unless the state is a graph; each package that holds a listed umbrella among `ids` is asked to load once, and other ids are ignored. */
function shownUmbrellasOf(ids: string[], state: GraphState, root: string, atoms: GraphFeeds['atoms']): boolean {
  if (state.kind !== 'graph') return false;

  const umbrellaIds = new Set(state.atomGroups.map((group) => group.umbrellaId));
  const named = new Set(ids);
  const shown = state.tasks.filter((task) => named.has(task.id) && umbrellaIds.has(task.id));
  const packageNames = new Set(shown.map((task) => task.packageName));

  for (const packageName of packageNames) atoms.childrenRequested(root, packageName);

  return true;
}

/** `false` unless the state is a graph; each listed package among `names` is asked to load once, in the order of `names`, and other names are ignored. */
function shownTaskPackagesOf(names: string[], state: GraphState, root: string, prediction: GraphFeeds['prediction']): boolean {
  if (state.kind !== 'graph') return false;

  const listed = new Set(state.tasks.map((task) => task.packageName));
  const shown = new Set(names.filter((name) => listed.has(name)));

  for (const packageName of shown) prediction.packageShown(root, packageName);

  return true;
}

/** Always handled: the toggle is global, not a property of the state, and a rejected `set` was already logged by the toggle. */
async function setViewToggleOf(message: GraphSetViewToggleMessage, toggles: GraphToggles): Promise<boolean> {
  await toggles[message.toggle].set(message.shown).catch((): undefined => undefined);

  return true;
}

/** `false` when the page asked for something the state does not allow; the session logs and drops that message. */
export async function requestHandledOf(message: GraphRequestMessage, context: RequestContext): Promise<boolean> {
  const { state, root, coordinator, ports, feeds } = context;

  switch (message.type) {
    case 'reload':
      return reloadOf(state, coordinator);
    case 'openDetails':
      return openDetailsOf(message.packageName, state, ports);
    case 'runTask':
    case 'stopTask':
      return routeRun(message, context);
    case 'shownUmbrellas':
      return shownUmbrellasOf(message.ids, state, root, feeds.atoms);
    case 'shownTaskPackages':
      return shownTaskPackagesOf(message.packageNames, state, root, feeds.prediction);
    case 'setViewToggle':
      return setViewToggleOf(message, feeds.toggles);
  }
}
