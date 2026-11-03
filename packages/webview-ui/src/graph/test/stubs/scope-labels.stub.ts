import { STATE_STUB } from './graph-layouts.stub.ts';
import type { GraphPackage, GraphReady } from '../../../bridge/common/graph-state.type.ts';

const bareOf = (pkg: GraphPackage): GraphPackage => {
  const bare: GraphPackage = { ...pkg, bareName: `bare-${pkg.name}` };

  return bare;
};

/** `h1` with each package's bare name `bare-<name>`, scopes shown. */
export const BARE_SHOWN_STUB: GraphReady = { ...STATE_STUB, packages: STATE_STUB.packages.map(bareOf) };

/** `h1` with the bare names, scopes hidden. */
export const BARE_HIDDEN_STUB: GraphReady = { ...BARE_SHOWN_STUB, scopeShown: false };

/** The labels of `BARE_HIDDEN_STUB`: each package's bare name. */
export const BARE_LABELS_STUB: ReadonlyMap<string, string> = new Map([
  ['web', 'bare-web'],
  ['ui', 'bare-ui'],
  ['core', 'bare-core']
]);
