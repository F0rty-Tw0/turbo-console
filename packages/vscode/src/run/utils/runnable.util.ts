import type { Coordinator, RootChange, Roots } from '../../roots/common/coordinator.type.ts';

/**
 * Resolves once `root` holds a binary in `roots` or its load settles (`whenSettled`), whichever comes first, and always
 * removes its listener. The binary lands with the second publish of a cached model, right after the resolve, while a
 * stale cache still has its full load (up to `LOAD_DEADLINE_MS`) ahead before the load settles.
 */
export const whenRunnable = async (roots: Roots, root: string, coordinator: Pick<Coordinator, 'whenSettled'>): Promise<void> => {
  const bound = Promise.withResolvers<undefined>();
  const listener = (change: RootChange): void => {
    const isBound = change.root === root && roots.get(root)?.state.binary !== null;

    if (isBound) bound.resolve(undefined);
  };
  const unsubscribe = roots.onDidChange(listener);

  try {
    const settled = coordinator.whenSettled();

    await Promise.race([bound.promise, settled]);
  } finally {
    unsubscribe();
  }
};
