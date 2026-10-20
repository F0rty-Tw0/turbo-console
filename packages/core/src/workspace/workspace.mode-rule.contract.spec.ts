import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { FixtureFile } from '@turbo-console/repo-gen';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hasPnpmWorkspacePackages } from './data-access/pnpm-workspace.ts';
import { declaresWorkspaces } from './utils/single-package.util.ts';
import { devTurboPath } from '../shared/turbo/test/utils/dev-turbo.spec.util.ts';
import { writeUncommittedRepo } from '../shared/turbo/test/utils/uncommitted-repo.spec.util.ts';
import { turboEnv } from '../shared/turbo/utils/turbo-env.util.ts';

const run = promisify(execFile);

type Manager = 'pnpm' | 'npm' | 'yarn';

type ManagerFiles = { readonly version: string; readonly lockfile: string };

const PNPM_FILES: ManagerFiles = { version: '10.0.0', lockfile: 'pnpm-lock.yaml' };

const NPM_FILES: ManagerFiles = { version: '10.0.0', lockfile: 'package-lock.json' };

const YARN_FILES: ManagerFiles = { version: '1.22.22', lockfile: 'yarn.lock' };

const MANAGERS: Record<Manager, ManagerFiles> = { pnpm: PNPM_FILES, npm: NPM_FILES, yarn: YARN_FILES };

type Shape = {
  readonly title: string;
  readonly manager: Manager;
  readonly workspaces: unknown;
  readonly yaml: string | null;
  readonly single: boolean;
};

const YAML_PACKAGES = 'packages:\n  - "packages/*"\n';

const LIST = ['packages/*'];

const PACKAGES_LIST = { packages: LIST };

const SHAPES: Shape[] = [
  { title: 'pnpm, no pnpm-workspace.yaml', manager: 'pnpm', workspaces: undefined, yaml: null, single: true },
  { title: 'pnpm, yaml packages/*', manager: 'pnpm', workspaces: undefined, yaml: YAML_PACKAGES, single: false },
  { title: 'pnpm, yaml without packages', manager: 'pnpm', workspaces: undefined, yaml: 'onlyBuiltDependencies: []\n', single: true },
  {
    title: 'pnpm, yaml with a byte order mark',
    manager: 'pnpm',
    workspaces: undefined,
    yaml: `\uFEFF${YAML_PACKAGES}`,
    single: false
  },
  {
    title: 'pnpm, yaml flow list over lines',
    manager: 'pnpm',
    workspaces: undefined,
    yaml: 'packages: [\n  "packages/*"\n]\n',
    single: false
  },
  { title: 'pnpm, package.json workspaces but no yaml', manager: 'pnpm', workspaces: LIST, yaml: null, single: true },
  { title: 'npm, no workspaces', manager: 'npm', workspaces: undefined, yaml: null, single: true },
  { title: 'npm, workspaces []', manager: 'npm', workspaces: [], yaml: null, single: true },
  { title: 'npm, workspaces packages/*', manager: 'npm', workspaces: LIST, yaml: null, single: false },
  { title: 'yarn, workspaces { packages }', manager: 'yarn', workspaces: PACKAGES_LIST, yaml: null, single: false }
];

/** The repo files of one shape: the `build` script, its turbo task, the manager's empty lockfile and the yaml, if any. */
const filesOf = (shape: Shape): FixtureFile[] => {
  const { version, lockfile } = MANAGERS[shape.manager];
  const scripts = { build: 'node -e 0' };
  const packageManager = `${shape.manager}@${version}`;
  const manifest = { name: 'a', packageManager, scripts, workspaces: shape.workspaces };
  const files: FixtureFile[] = [
    { path: 'package.json', content: JSON.stringify(manifest) },
    { path: 'turbo.json', content: '{"tasks":{"build":{}}}' },
    { path: lockfile, content: '' }
  ];

  if (shape.yaml !== null) files.push({ path: 'pnpm-workspace.yaml', content: shape.yaml });

  return files;
};

/** Whether turbo itself infers a monorepo for `root`: no `--skip-infer`, so it reads the workspace files. Test-only. */
const turboInfersMonorepo = async (root: string): Promise<boolean> => {
  const env = turboEnv(process.env);
  const { stdout } = await run(devTurboPath(), ['run', 'build', '--dry=json'], { cwd: root, env });
  const json: unknown = JSON.parse(stdout);

  return typeof json === 'object' && json !== null && Reflect.get(json, 'monorepo') === true;
};

describe('FEATURE: the mode rule agrees with turbo own inference', () => {
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'mode-rule-'));
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const writeShape = async (shape: Shape): Promise<string> => {
    const root = await mkdtemp(join(tempDir, 'shape-'));

    await writeUncommittedRepo(root, filesOf(shape));

    return root;
  };

  describe('GIVEN each probe-11 shape', () => {
    it.each(SHAPES)('WHEN $title THEN turbo infers its mode and our rule agrees', async (shape) => {
      const root = await writeShape(shape);
      const isMonorepo = await turboInfersMonorepo(root);
      const pnpmPackages = shape.manager === 'pnpm' && (await hasPnpmWorkspacePackages(root));
      const declares = declaresWorkspaces(shape.manager, shape.workspaces, pnpmPackages);

      expect(!isMonorepo).toBe(shape.single);
      expect(!declares).toBe(!isMonorepo);
    });
  });
});
