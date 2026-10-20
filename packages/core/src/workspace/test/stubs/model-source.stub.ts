import { DEFAULT_PACKAGE_MANAGER } from '../../common/package-manager.const.ts';
import type { ModelSource } from '../../common/workspace-model.type.ts';

/** The turbo version and root most model specs build with, and the npm fallback as the package manager. */
export const MODEL_SOURCE_STUB: ModelSource = {
  turboVersion: '2.11.7',
  root: '/repo',
  packageManager: DEFAULT_PACKAGE_MANAGER,
  singlePackage: false,
  rootLabel: null
};
