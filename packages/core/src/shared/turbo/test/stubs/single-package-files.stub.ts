import type { FixtureFile } from '@turbo-console/repo-gen';

const fileOf = (path: string, content: string): FixtureFile => {
  const file: FixtureFile = { path, content };

  return file;
};

const SCRIPTS = { build: 'node -e 0', lint: 'node -e 0' };

const MANIFEST = {
  name: 'single-app',
  private: true,
  packageManager: 'pnpm@10.0.0',
  scripts: SCRIPTS
};

/** A single-package turbo repo: a root `turbo.json`, no workspaces. */
export const SINGLE_PACKAGE_FILES_STUB: FixtureFile[] = [
  fileOf('package.json', JSON.stringify(MANIFEST)),
  fileOf('turbo.json', '{"tasks":{"build":{},"lint":{}}}'),
  fileOf('pnpm-lock.yaml', ''),
  fileOf('.gitignore', '.turbo\nnode_modules\n')
];
