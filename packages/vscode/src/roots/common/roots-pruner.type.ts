/** A registry of per-root panels: `pruneRoots` closes the panels of roots that left the store. */
export type RootsPruner = {
  readonly pruneRoots: () => void;
};
