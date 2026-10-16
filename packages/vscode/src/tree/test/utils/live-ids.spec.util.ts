import type { LiveIds } from '../../../run/common/run.type.ts';

/** A `LiveIds` that holds `ids` for `liveRoot` alone: every other root has none, as the run store keys by root. */
export const liveIdsOf = (liveRoot: string, ...ids: string[]): LiveIds => {
  const held: ReadonlySet<string> = new Set(ids);
  const none: ReadonlySet<string> = new Set();
  const live: LiveIds = (root) => (root === liveRoot ? held : none);

  return live;
};
