import { whenRunnable } from './runnable.util.ts';
import type { RootState, Roots } from '../../roots/common/coordinator.type.ts';
import type { TaskTarget } from '../common/run.type.ts';

/** The state of the root of `target` once it can run: a cached model published before the binary waits for its load to settle. */
export const runnableStateOf = async (roots: Roots, target: TaskTarget): Promise<RootState | undefined> => {
  const entry = roots.get(target.definition.root);

  if (entry?.state.binary === null) await whenRunnable(roots, target.definition.root, entry.coordinator);

  return roots.get(target.definition.root)?.state;
};
