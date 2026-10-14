import type { RootChange, Session } from '../../roots/common/coordinator.type.ts';
import type { RootWatchers, WatchPorts, WatchRoot } from '../common/watch.type.ts';

/**
 * Spec §4.3 watchers: a root gets its watchers from `watch` on its first load (its first store change), and loses them
 * when it stops being a root: the folder-change wiring calls `prune` once the roots changed. `dispose` stops them all.
 */
export const registerWatchers = (session: Session, watch: WatchRoot): RootWatchers => {
  const watchers = new Map<string, () => void>();
  const portsFor = (root: string): WatchPorts => {
    const packagePaths = (): string[] => {
      const packages = session.store.get(root)?.state.model?.packages ?? [];

      return packages.map((node) => node.path);
    };
    const ports: WatchPorts = {
      changed: () => {
        session.changed(root);
      },
      packagePaths
    };

    return ports;
  };
  const onChange = ({ root }: RootChange): void => {
    const isWatched = watchers.has(root);

    if (isWatched) return;

    const ports = portsFor(root);
    const stop = watch(root, ports);

    watchers.set(root, stop);
  };
  const prune = (): void => {
    for (const [root, stop] of watchers) {
      const entry = session.store.get(root);

      if (entry !== undefined) continue;

      stop();
      watchers.delete(root);
    }
  };
  const unsubscribe = session.store.onDidChange(onChange);
  const dispose = (): void => {
    unsubscribe();

    for (const stop of watchers.values()) stop();

    watchers.clear();
  };
  const rootWatchers: RootWatchers = { prune, dispose };

  return rootWatchers;
};
