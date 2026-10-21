import type { GraphReady } from '../../../src/bridge/common/graph-state.type.ts';

/** The package names of a ready state, as the probe lists node ids. */
export const packageNamesOf = (state: GraphReady): string[] => state.packages.map((pkg) => pkg.name);
