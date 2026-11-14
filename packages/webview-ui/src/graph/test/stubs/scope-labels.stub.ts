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

/** The root `//` with its sizing text `(root) savings`, its bare name reading `savings` while scopes are shown. */
const ROOT_SIZED_STUB: GraphPackage = {
  name: '//',
  bareName: 'savings',
  sizeName: '(root) savings',
  path: '',
  tags: [],
  taskCount: 0
};

/** `BARE_SHOWN_STUB` plus the sized root `//`, scopes shown. */
export const ROOT_SIZED_SHOWN_STUB: GraphReady = { ...BARE_SHOWN_STUB, packages: [...BARE_SHOWN_STUB.packages, ROOT_SIZED_STUB] };

const ROOT_HIDDEN_PACKAGES: GraphPackage[] = [...BARE_SHOWN_STUB.packages, { ...ROOT_SIZED_STUB, bareName: '(root) savings' }];

/** `ROOT_SIZED_SHOWN_STUB` with scopes hidden: the root reads `(root) savings`. */
export const ROOT_SIZED_HIDDEN_STUB: GraphReady = { ...ROOT_SIZED_SHOWN_STUB, scopeShown: false, packages: ROOT_HIDDEN_PACKAGES };

/** The sizing texts of the sized root stubs: only `//` has one. */
export const ROOT_SIZE_TEXTS_STUB: ReadonlyMap<string, string> = new Map([['//', '(root) savings']]);
