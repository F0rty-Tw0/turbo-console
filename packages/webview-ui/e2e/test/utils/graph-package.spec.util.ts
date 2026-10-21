import type { GraphPackage, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';

/** A package record; `path` defaults to `packages/<name>`. */
export const packageOf = (name: string, path = `packages/${name}`, tags: string[] = []): GraphPackage => {
  const info: GraphPackage = { name, path, tags };

  return info;
};

const defaultRecordOf = (name: string): GraphPackage => packageOf(name);

/** A record per name, each at its default path. */
export const packagesOf = (names: string[]): GraphPackage[] => names.map(defaultRecordOf);

/** The package names of a ready state, as the probe lists node ids. */
export const stateNamesOf = (state: GraphReady): string[] => state.packages.map((pkg) => pkg.name);
