import { toJsonFile } from './json-file.util.ts';
import { NOOP_SCRIPT } from '../common/fixture.const.ts';
import type { FixtureFile, PackagePlan } from '../common/fixture.type.ts';

type PackageJson = {
  readonly name: string;
  readonly private: true;
  readonly version: string;
  readonly scripts: Record<string, string>;
  readonly dependencies: Record<string, string> | undefined;
};

type PackageTurboJson = {
  readonly extends: string[];
  readonly tags: string[];
};

const packageJsonFile = (pkg: PackagePlan): FixtureFile => {
  const runnable = pkg.tasks.filter((task) => !pkg.phantoms.includes(task));
  const scripts = Object.fromEntries(runnable.map((task) => [task, NOOP_SCRIPT]));
  const workspaceDependencies = Object.fromEntries(pkg.dependencies.map((dependency) => [dependency, 'workspace:*']));
  const dependencies = pkg.dependencies.length > 0 ? workspaceDependencies : undefined;
  const manifest: PackageJson = { name: pkg.name, private: true, version: '0.0.0', scripts, dependencies };

  return toJsonFile(`${pkg.path}/package.json`, manifest);
};

const turboJsonFiles = (pkg: PackagePlan): FixtureFile[] => {
  if (pkg.tags.length === 0) return [];

  const turbo: PackageTurboJson = { extends: ['//'], tags: pkg.tags };

  return [toJsonFile(`${pkg.path}/turbo.json`, turbo)];
};

/**
 * Files of a regular package or the hub. `README.md` sits outside `src/**`, so editing it misses `test`'s narrow inputs.
 * A tagged package (the hub) also gets a `turbo.json` that extends the root.
 */
export const renderPackageFiles = (pkg: PackagePlan): FixtureFile[] => {
  const readme: FixtureFile = { path: `${pkg.path}/README.md`, content: `# ${pkg.name}\n` };
  const index: FixtureFile = { path: `${pkg.path}/src/index.ts`, content: `export const name = '${pkg.name}';\n` };
  const turboFiles = turboJsonFiles(pkg);

  return [packageJsonFile(pkg), readme, index, ...turboFiles];
};
