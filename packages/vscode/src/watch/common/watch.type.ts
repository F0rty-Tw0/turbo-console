/** What one root's watchers report to: `changed` gets only events that passed the filters. */
export type WatchPorts = {
  readonly changed: () => void;
  readonly packagePaths: () => string[];
};

/** Starts the watchers of one root; the result stops them. */
export type WatchRoot = (root: string, ports: WatchPorts) => () => void;

/** Every root's watchers: `prune` stops those of roots no longer in the store, `dispose` stops all for good. */
export type RootWatchers = {
  readonly prune: () => void;
  readonly dispose: () => void;
};
