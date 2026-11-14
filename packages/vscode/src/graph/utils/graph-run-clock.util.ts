import type { GraphRunsMessage } from '@turbo-console/webview-ui';

import type { RunSources } from '../common/graph.type.ts';

type Launches = Readonly<Record<string, number>>;

/** Task id → `launchedAt` of its own run, for each of the `ids` whose own run is `running`; an owned run never counts. */
export const launchesOf = (root: string, ids: string[], sources: Pick<RunSources, 'get'>): Launches => {
  const launchOf = (id: string): [string, number][] => {
    const own = sources.get(root, id);

    if (own?.state !== 'running') return [];

    return [[id, own.launchedAt]];
  };
  const entries = ids.flatMap(launchOf);

  return Object.fromEntries(entries);
};

/** `message` itself when nothing is launched, else with `elapsed`: ms since each launch at `wallNow`, never below 0. */
export const withElapsedOf = (message: GraphRunsMessage, launches: Launches, wallNow: number): GraphRunsMessage => {
  const launchEntries = Object.entries(launches);

  if (launchEntries.length === 0) return message;

  const elapsedEntries = launchEntries.map(([id, launchedAt]): [string, number] => [id, Math.max(0, wallNow - launchedAt)]);
  const elapsed = Object.fromEntries(elapsedEntries);
  const clocked: GraphRunsMessage = { ...message, elapsed };

  return clocked;
};

/** The dedupe text of a runs message: its runs, owners and launches; `elapsed` is left out, so a moving clock alone posts nothing. */
export const runsTextOf = (message: GraphRunsMessage, launches: Launches): string =>
  JSON.stringify([message.runs, message.owners, launches]);
