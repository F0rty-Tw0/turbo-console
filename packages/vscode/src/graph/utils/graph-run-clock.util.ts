import type { GraphRunsMessage } from '@turbo-console/webview-ui';

import type { ClockedRuns } from '../common/graph.type.ts';

type Launches = ClockedRuns['launches'];

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
