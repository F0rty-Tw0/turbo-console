import type { AtomGroup, AtomResult } from '@turbo-console/core';

/** What a package's dry run says of one file task: replayed from cache, run, or not knowable before the run (`deferred`). */
export type AtomCache = 'HIT' | 'MISS' | 'deferred';

/**
 * What a package's Atomizer rows are read with. `groups` come from the model; `dryRun` and `results` are `null` until
 * their load settled, so a count that needs them is left out instead of shown as zero.
 */
export type AtomView = {
  readonly groups: AtomGroup[];
  readonly dryRun: ReadonlyMap<string, AtomCache> | null;
  readonly results: ReadonlyMap<string, AtomResult> | null;
};

/** The view of one package of the folder `root`; `groups: []` for a package without Atomizer groups. */
export type AtomLookup = (root: string, packageName: string) => AtomView;
