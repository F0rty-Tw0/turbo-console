import { FIXTURE_PACKAGE_MANAGER, renderLockfile } from '@turbo-console/repo-gen';
import type { FixtureFile } from '@turbo-console/repo-gen';

/** The one package of the interrupt fixture. */
export const INTERRUPT_PACKAGE_STUB: string = '@acme/a';

/**
 * What the `slow` script prints once it runs, so a test interrupts turbo mid-task. The script builds it from two halves:
 * the package manager echoes the script line before running it, and that echo must not hold the whole text.
 */
export const SLOW_READY_STUB: string = 'slow-ready';

/** How long the `slow` script waits after it prints: long past any interrupt. */
export const SLOW_SCRIPT_MS_STUB: number = 60_000;

/** Prints `SLOW_READY_STUB`, then waits `SLOW_SCRIPT_MS_STUB`. */
export const SLOW_SCRIPT_STUB: string = `node -e "console.log('slow'+'-ready');setTimeout(()=>{},${SLOW_SCRIPT_MS_STUB})"`;

const fileOf = (path: string, content: string): FixtureFile => {
  const file: FixtureFile = { path, content };

  return file;
};

const SCRIPTS = { slow: SLOW_SCRIPT_STUB };

const PACKAGE_MANIFEST = JSON.stringify({ name: INTERRUPT_PACKAGE_STUB, scripts: SCRIPTS });

const ROOT_MANIFEST = JSON.stringify({ name: 'root', private: true, packageManager: FIXTURE_PACKAGE_MANAGER });

/** A one-package repo whose uncached `slow` task runs until it is interrupted. */
export const INTERRUPT_FIXTURE_FILES_STUB: FixtureFile[] = [
  fileOf('package.json', ROOT_MANIFEST),
  renderLockfile([{ name: INTERRUPT_PACKAGE_STUB, path: 'packages/a', dependencies: [] }]),
  fileOf('pnpm-workspace.yaml', 'packages:\n  - packages/*\n'),
  fileOf('turbo.json', '{"tasks":{"slow":{"cache":false}}}'),
  fileOf('.gitignore', '.turbo\nnode_modules\n'),
  fileOf('packages/a/package.json', PACKAGE_MANIFEST)
];
