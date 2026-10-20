import { FIXTURE_PACKAGE_MANAGER, renderLockfile } from '@turbo-console/repo-gen';
import type { FixtureFile } from '@turbo-console/repo-gen';

/** The one package of the force fixture. */
export const FORCE_PACKAGE_STUB: string = '@acme/a';

/** Writes `dist/out.txt`: an output the next plain run restores from the cache. */
const BUILD_SCRIPT = `node -e "require('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/out.txt','x')"`;

const fileOf = (path: string, content: string): FixtureFile => {
  const file: FixtureFile = { path, content };

  return file;
};

const SCRIPTS = { build: BUILD_SCRIPT };

const PACKAGE_MANIFEST = JSON.stringify({ name: FORCE_PACKAGE_STUB, scripts: SCRIPTS });

const ROOT_MANIFEST = JSON.stringify({ name: 'root', private: true, packageManager: FIXTURE_PACKAGE_MANAGER });

/**
 * Spec §5.3 probe P2's fixture. `dist` is git-ignored: without that, the first run's output changes the package's
 * inputs and the second plain run misses too. The pnpm pin and env lockfile match CI's pnpm, so a real run never makes
 * pnpm download another version of itself.
 */
export const FORCE_FIXTURE_FILES_STUB: FixtureFile[] = [
  fileOf('package.json', ROOT_MANIFEST),
  renderLockfile([{ name: FORCE_PACKAGE_STUB, path: 'packages/a', dependencies: [] }]),
  fileOf('pnpm-workspace.yaml', 'packages:\n  - packages/*\n'),
  fileOf('turbo.json', '{"tasks":{"build":{"outputs":["dist/**"]}}}'),
  fileOf('.gitignore', 'dist\n.turbo\nnode_modules\n'),
  fileOf('packages/a/package.json', PACKAGE_MANIFEST)
];
