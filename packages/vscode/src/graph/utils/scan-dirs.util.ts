import { join } from 'node:path';

import type { GraphPackage } from '@turbo-console/webview-ui';

import type { ScanDirs } from '../common/import-match.type.ts';

/** The dirs of one scan of `source` for the edge to `target`; every other package but the root one is skipped, so B nested in A is B's own (D7). */
export const scanDirsOf = (root: string, packages: GraphPackage[], source: GraphPackage, target: GraphPackage): ScanDirs => {
  const isSkipped = (info: GraphPackage): boolean => info !== source && info.path !== '';
  const skipped = packages.filter(isSkipped).map((info) => join(root, info.path));
  const targetPath = join(root, target.path);
  const targetDir = target.path === '' ? null : targetPath;
  const dirs: ScanDirs = { sourceDir: join(root, source.path), targetDir, skipDirs: new Set(skipped) };

  return dirs;
};
