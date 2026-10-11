import { posix } from 'node:path';

import type { FixtureFile, PackagePlan } from '../common/fixture.type.ts';

type LockfilePackage = Pick<PackagePlan, 'dependencies' | 'name' | 'path'>;

const LOCKFILE_HEADER =
  "lockfileVersion: '9.0'\n\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\n\nimporters:";

const ROOT_IMPORTER = '  .: {}';

const comparePaths = (left: LockfilePackage, right: LockfilePackage): number => {
  if (left.path === right.path) return 0;

  return left.path < right.path ? -1 : 1;
};

const dependencyLines = (importer: LockfilePackage, pathByName: Map<string, string>, dependency: string): string[] => {
  const dependencyPath = pathByName.get(dependency);

  if (dependencyPath === undefined) throw new Error(`${importer.name} depends on ${dependency}, which is not in the workspace`);

  const link = posix.relative(importer.path, dependencyPath);

  return [`      '${dependency}':`, '        specifier: workspace:*', `        version: link:${link}`];
};

const importerBlock = (importer: LockfilePackage, pathByName: Map<string, string>): string => {
  if (importer.dependencies.length === 0) return `  ${importer.path}: {}`;

  const dependencies = importer.dependencies.toSorted();
  const lines = dependencies.flatMap((dependency) => dependencyLines(importer, pathByName, dependency));
  const block = [`  ${importer.path}:`, '    dependencies:', ...lines];

  return block.join('\n');
};

/**
 * `pnpm-lock.yaml` in the single-document shape pnpm 12.11.2 writes: one importer per package, sorted by path,
 * with a `link:` entry per workspace dependency. Takes every workspace package, so atom packages can be added.
 */
export const renderLockfile = (packages: LockfilePackage[]): FixtureFile => {
  const pathByName = new Map(packages.map((pkg) => [pkg.name, pkg.path]));
  const importers = packages.toSorted(comparePaths).map((pkg) => importerBlock(pkg, pathByName));
  const blocks = [LOCKFILE_HEADER, ROOT_IMPORTER, ...importers];
  const file: FixtureFile = { path: 'pnpm-lock.yaml', content: `${blocks.join('\n\n')}\n` };

  return file;
};
