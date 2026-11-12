import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';

import type { FixtureFile } from '@turbo-console/repo-gen';

import { writeUncommittedRepo } from '../../../shared/turbo/test/utils/uncommitted-repo.spec.util.ts';

const ROOT_MANIFEST =
  '{"name":"root-fixture","private":true,"packageManager":"pnpm@10.0.0",' +
  '"scripts":{"lint":"echo root-lint","format":"echo root-format","build":"echo root-build"}}';

const ROOT_TURBO = '{"tasks":{"build":{"dependsOn":["^build"]},"//#lint":{}}}';

const WORKSPACE_YAML = 'packages:\n  - "apps/*"\n  - "libs/*"\n';

const WEB_MANIFEST = '{"name":"web","version":"0.0.0","scripts":{"build":"echo web"},"dependencies":{"ui":"workspace:*"}}';

const UI_MANIFEST = '{"name":"ui","version":"0.0.0","scripts":{"build":"echo ui"}}';

const MONOREPO_ROOT_FILES: FixtureFile[] = [
  { path: 'package.json', content: ROOT_MANIFEST },
  { path: 'turbo.json', content: ROOT_TURBO },
  { path: 'pnpm-workspace.yaml', content: WORKSPACE_YAML },
  { path: 'pnpm-lock.yaml', content: 'lockfileVersion: "9.0"\n' },
  { path: 'apps/web/package.json', content: WEB_MANIFEST },
  { path: 'libs/ui/package.json', content: UI_MANIFEST }
];

/**
 * A new uncommitted pnpm monorepo under `parent`: `apps/web` depends on `libs/ui`, both with a `build` the root
 * `turbo.json` keys, and a root `package.json` named `root-fixture` with the scripts `lint`, `format` and `build`, of
 * which only `lint` has a `//#lint` key. The caller removes `parent`.
 */
export const writeMonorepoRootFixture = async (parent: string): Promise<string> => {
  const root = await mkdtemp(join(parent, 'mr-'));

  await writeUncommittedRepo(root, MONOREPO_ROOT_FILES);

  return root;
};
