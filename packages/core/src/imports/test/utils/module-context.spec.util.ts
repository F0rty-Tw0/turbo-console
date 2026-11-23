import type { ModuleResolveContext, WorkspaceTarget } from '../../common/module-graph.type.ts';
import { A_DIR } from '../common/module-dirs.const.ts';

/** A resolve context for package `@s/a` at `A_DIR` that walked `walked`, with `patch` over it. */
export const contextOf = (walked: string[], patch: Partial<ModuleResolveContext> = {}): ModuleResolveContext => {
  const walkedSet = new Set(walked);
  const context: ModuleResolveContext = { dir: A_DIR, selfName: '@s/a', walked: walkedSet, tsconfigPaths: null, others: [], ...patch };

  return context;
};

/** A workspace package named `name` at `dir`, with no alias keys. */
export const targetOf = (dir: string, name: string): WorkspaceTarget => {
  const target: WorkspaceTarget = { name, names: [name], dir };

  return target;
};
