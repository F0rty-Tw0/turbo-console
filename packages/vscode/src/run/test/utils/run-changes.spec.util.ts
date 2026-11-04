import type { RunEntry, Runs } from '../../common/run.type.ts';

/** Every entry `store` announces from now on, in order; the list fills as the store changes. */
export const changesOf = (store: Runs): RunEntry[] => {
  const changes: RunEntry[] = [];

  store.onDidChange((entry) => changes.push(entry));

  return changes;
};
