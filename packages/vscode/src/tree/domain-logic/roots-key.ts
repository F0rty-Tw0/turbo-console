import type { RootEntry, Roots } from '../../roots/common/coordinator.type.ts';
import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { ContextKeyTracker } from '../common/context-key.type.ts';

/**
 * Sends what `valueOf` says of the roots once now and again each time the answer changes, after every root change and
 * every `refresh`. A rejected send is logged and forgotten, so the next `refresh` sends again. `dispose` stops it all.
 */
export const trackRootsKey = (
  roots: Roots,
  valueOf: (entries: RootEntry[]) => boolean,
  setKey: (value: boolean) => Thenable<void>,
  log: (line: string) => void
): ContextKeyTracker => {
  let sent: boolean | null = null;
  let isDisposed = false;

  const forget = (error: unknown): void => {
    log(logTextOf(error));
    sent = null;
  };
  const refresh = (): void => {
    if (isDisposed) return;

    const value = valueOf(roots.all());

    if (value === sent) return;

    sent = value;
    setKey(value).then(undefined, forget);
  };
  const unsubscribe = roots.onDidChange(refresh);
  const dispose = (): void => {
    isDisposed = true;
    unsubscribe();
  };
  const tracker: ContextKeyTracker = { refresh, dispose };

  refresh();

  return tracker;
};
