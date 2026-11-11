import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { AffectedListener, AffectedListeners } from '../common/affected.type.ts';

/**
 * The listeners of a shared store. A throwing listener is logged as `affected <root>: listener failed: <error>`, so the
 * ones after it still hear the change and the throw never rejects the query's settle callback.
 */
export const affectedListenersOf = (log: (line: string) => void): AffectedListeners => {
  const listeners = new Set<AffectedListener>();
  const tell = (listener: AffectedListener, root: string): void => {
    try {
      listener(root);
    } catch (error) {
      const line = `affected ${root}: listener failed: ${logTextOf(error)}`;

      log(logTextOf(line));
    }
  };
  const changed: AffectedListener = (root) => {
    for (const listener of listeners) tell(listener, root);
  };
  const onDidChange = (listener: AffectedListener): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };
  const clear = (): void => {
    listeners.clear();
  };
  const subscribers: AffectedListeners = { changed, onDidChange, clear };

  return subscribers;
};
