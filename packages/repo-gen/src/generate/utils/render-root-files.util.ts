import { toJsonFile } from './json-file.util.ts';
import { atomPackages } from './plan-atom-groups.util.ts';
import { renderLockfile } from './render-lockfile.util.ts';
import { renderTurboJson } from './render-turbo-json.util.ts';
import { FIXTURE_PACKAGE_MANAGER } from '../common/fixture.const.ts';
import type { FixtureFile, FixturePlan, FixtureSpec } from '../common/fixture.type.ts';

type RootPackageJson = {
  readonly name: string;
  readonly private: true;
  readonly packageManager: string;
  readonly scripts: Record<string, string> | undefined;
};

const workspaceFile = (plan: FixturePlan): FixtureFile => {
  const hasAtomGroups = plan.spec.atomGroups.count > 0;
  const globs = hasAtomGroups ? '  - apps/*\n  - packages/*\n  - tools/*\n' : '  - packages/*\n';
  const file: FixtureFile = { path: 'pnpm-workspace.yaml', content: `packages:\n${globs}` };

  return file;
};

const rootScripts = (spec: FixtureSpec): Record<string, string> | undefined => {
  if (spec.rootTask?.command === undefined) return undefined;

  const { name, command } = spec.rootTask;
  const scripts = { [name]: command };

  return scripts;
};

/**
 * Fixture root files. `.gitignore` keeps `.turbo/` logs out of task inputs, and the hand-rendered lockfile
 * spares the fixture a `pnpm install` that would shift hashes between runs.
 */
export const renderRootFiles = (plan: FixturePlan): FixtureFile[] => {
  const scripts = rootScripts(plan.spec);
  const manifest: RootPackageJson = { name: 'fx-root', private: true, packageManager: FIXTURE_PACKAGE_MANAGER, scripts };
  const gitignore: FixtureFile = { path: '.gitignore', content: 'node_modules/\n.turbo/\n' };
  const atomImporters = plan.atomGroups.flatMap(atomPackages);
  const lockfile = renderLockfile([...plan.packages, ...atomImporters]);

  return [toJsonFile('package.json', manifest), workspaceFile(plan), gitignore, renderTurboJson(plan), lockfile];
};
