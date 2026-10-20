import type { PackageGraph } from '../../shared/turbo/common/turbo.type.ts';
import type { PackageManagerName } from '../common/workspace-model.type.ts';

const isNonEmptyList = (value: unknown): value is unknown[] => Array.isArray(value) && value.length > 0;

/**
 * Whether the repo declares workspaces (spec §1, §4.1): the package manager names a non-empty list. pnpm only through
 * `pnpm-workspace.yaml` `packages` (`pnpmPackages`; a package.json `workspaces` is ignored); npm, yarn and bun through
 * package.json `workspaces`, a non-empty array or an object whose `packages` is one. Mirrors turbo 2.11.7 (bun follows
 * npm, unprobed); single-package is the negation.
 */
export const declaresWorkspaces = (manager: PackageManagerName, workspaces: unknown, pnpmPackages: boolean): boolean => {
  if (manager === 'pnpm') return pnpmPackages;

  if (isNonEmptyList(workspaces)) return true;

  if (typeof workspaces !== 'object' || workspaces === null) return false;

  return isNonEmptyList(Reflect.get(workspaces, 'packages'));
};

/**
 * `graph` with its `root` package as the one node and no edges, so the model build, the cache and its keys see one
 * package list; `graph` itself when `root` is `null`.
 */
export const singlePackageGraphOf = (graph: PackageGraph): PackageGraph => {
  const { root } = graph.data;

  if (root === null) return graph;

  const nodes = { items: [root] };
  const edges = { items: [] };
  const packageGraph = { nodes, edges };
  const data = { packageGraph, root };
  const derived: PackageGraph = { data };

  return derived;
};
