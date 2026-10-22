import type { FolderFacts } from '../../common/graph-folders.type.ts';

/** The boards graph's `apps` folder, expanded and shown. */
export const APPS_FOLDER_STUB: FolderFacts = { folder: 'apps', isCollapsed: false, isVisible: true, packages: ['docs', 'web'] };

/** The boards graph's `packages` folder, expanded and shown. */
export const PACKAGES_FOLDER_STUB: FolderFacts = {
  folder: 'packages',
  isCollapsed: false,
  isVisible: true,
  packages: ['@acme/config', '@acme/ui', '@acme/utils']
};
