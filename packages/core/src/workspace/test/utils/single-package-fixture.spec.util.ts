import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';

import type { FixtureFile } from '@turbo-console/repo-gen';

import { backdateTree } from '../../../cache/test/utils/backdate.spec.util.ts';
import { AGE_MS } from '../../../cache/test/utils/root-fixture.spec.util.ts';
import { writeUncommittedRepo } from '../../../shared/turbo/test/utils/uncommitted-repo.spec.util.ts';

const SINGLE_MANIFEST =
  '{"name":"single-app","version":"1.0.0","packageManager":"pnpm@10.0.0","scripts":{"build":"echo build","lint":"echo lint",' +
  '"dev":"echo dev","test:unit":"echo unit","format":"echo fmt"}}';

const SINGLE_TURBO =
  '{"tasks":{"build":{"outputs":["dist/**"]},"lint":{},"dev":{"persistent":true,"cache":false},"test:unit":{"dependsOn":["build"]}}}';

const EDGES_MANIFEST =
  '{"name":"single-app","version":"1.0.0","packageManager":"pnpm@10.0.0","scripts":{"build":"echo build","lint":"echo lint",' +
  '"typecheck":"echo types","format":"echo fmt","dev":"echo dev"}}';

const EDGES_TURBO =
  '{"tasks":{"build":{"dependsOn":["lint","typecheck","format"]},"lint":{},"typecheck":{"dependsOn":["lint"]},' +
  '"dev":{"persistent":true,"dependsOn":["build"]}}}';

const EMPTY_MANIFEST =
  '{"name":"empty-ws","version":"1.0.0","packageManager":"pnpm@10.0.0","scripts":{"build":"echo build","lint":"echo lint"}}';

const EMPTY_TURBO = '{"tasks":{"build":{}}}';

const EMPTY_WORKSPACE_YAML = 'packages:\n  - "packages/*"\n';

const SINGLE_FILES: FixtureFile[] = [
  { path: 'package.json', content: SINGLE_MANIFEST },
  { path: 'turbo.json', content: SINGLE_TURBO },
  { path: 'pnpm-lock.yaml', content: '' }
];

const EDGES_FILES: FixtureFile[] = [
  { path: 'package.json', content: EDGES_MANIFEST },
  { path: 'turbo.json', content: EDGES_TURBO },
  { path: 'pnpm-lock.yaml', content: '' }
];

const EMPTY_WORKSPACE_FILES: FixtureFile[] = [
  { path: 'package.json', content: EMPTY_MANIFEST },
  { path: 'turbo.json', content: EMPTY_TURBO },
  { path: 'pnpm-workspace.yaml', content: EMPTY_WORKSPACE_YAML },
  { path: 'pnpm-lock.yaml', content: '' }
];

const writeFixture = async (parent: string, files: FixtureFile[]): Promise<string> => {
  const root = await mkdtemp(join(parent, 'sp-'));

  await writeUncommittedRepo(root, files);
  await backdateTree(root, AGE_MS);

  return root;
};

/**
 * A new uncommitted single-package pnpm repo under `parent` (spec §1, §2): root scripts `build lint dev test:unit
 * format`, `dev` persistent, no workspace. Every file last written `AGE_MS` ago; the caller removes `parent`.
 */
export const writeSinglePackageFixture = async (parent: string): Promise<string> => writeFixture(parent, SINGLE_FILES);

/** A new uncommitted pnpm repo under `parent` whose `pnpm-workspace.yaml` lists `packages/*`, none present (spec §2.6). */
export const writeEmptyWorkspaceFixture = async (parent: string): Promise<string> => writeFixture(parent, EMPTY_WORKSPACE_FILES);

/**
 * A new uncommitted single-package pnpm repo under `parent` whose tasks depend on each other: `build` on `lint`,
 * `typecheck` and the unkeyed script `format`, `typecheck` on `lint`, persistent `dev` on `build`.
 */
export const writeEdgesFixture = async (parent: string): Promise<string> => writeFixture(parent, EDGES_FILES);
