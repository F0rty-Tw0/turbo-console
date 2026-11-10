import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { PredictionListener, PredictionListeners } from '../common/prediction.type.ts';

/**
 * The listeners of a shared store. A throwing listener is logged as `prediction <root>: listener failed: <error>`, so the
 * ones after it still hear the change and the throw never rejects the load's settle callback.
 */
export const predictionListenersOf = (log: (line: string) => void): PredictionListeners => {
  const listeners = new Set<PredictionListener>();
  const tell = (listener: PredictionListener, root: string, packageNames: ReadonlySet<string>): void => {
    try {
      listener(root, packageNames);
    } catch (error) {
      const line = `prediction ${root}: listener failed: ${logTextOf(error)}`;

      log(logTextOf(line));
    }
  };
  const changed: PredictionListener = (root, packageNames) => {
    for (const listener of listeners) tell(listener, root, packageNames);
  };
  const onDidChange = (listener: PredictionListener): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };
  const clear = (): void => {
    listeners.clear();
  };
  const subscribers: PredictionListeners = { changed, onDidChange, clear };

  return subscribers;
};
