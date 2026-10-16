import type { LiveIds } from '../../../run/common/run.type.ts';

/** The scripts half of a row context a spec sets: the toggle and the live run ids per root. */
export type ScriptsContext = {
  readonly scriptsShown: boolean;
  readonly live: LiveIds;
};
