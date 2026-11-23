import { resolveSpecifierOf } from './module-resolve.util.ts';
import type { ModuleResolveContext, ModuleTarget } from '../common/module-graph.type.ts';

/** The target of `specifier` imported from `fromDir`, resolved once per (importing dir, specifier) and kept in `memo`. */
export const memoTargetOf = (
  memo: Map<string, Map<string, ModuleTarget>>,
  context: ModuleResolveContext,
  fromDir: string,
  specifier: string
): ModuleTarget => {
  const targets = memo.get(fromDir) ?? new Map<string, ModuleTarget>();
  const target = targets.get(specifier) ?? resolveSpecifierOf(specifier, fromDir, context);

  targets.set(specifier, target);
  memo.set(fromDir, targets);

  return target;
};
