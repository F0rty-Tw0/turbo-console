import type { PackageViewModel } from '../../common/details.type.ts';

/** `web`, unfocused, with five tasks and no neighbours. */
export const WEB_PACKAGE_STUB: PackageViewModel = {
  name: 'web',
  path: 'packages/web',
  tags: [],
  taskCount: 5,
  isFocused: false,
  dependencies: [],
  dependents: []
};

/** `web`, the focus. */
export const FOCUSED_WEB_PACKAGE_STUB: PackageViewModel = { ...WEB_PACKAGE_STUB, isFocused: true };
