import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { writeUncommittedRepo } from './uncommitted-repo.spec.util.ts';
import type { SinglePackageRepo } from '../common/turbo.type.ts';
import { SINGLE_PACKAGE_FILES_STUB } from '../stubs/single-package-files.stub.ts';

/** Writes `SINGLE_PACKAGE_FILES_STUB` into a fresh temp dir named after `prefix`, uncommitted; `dispose` removes the dir. */
export const singlePackageRepo = async (prefix: string): Promise<SinglePackageRepo> => {
  const dir = await mkdtemp(join(tmpdir(), prefix));

  await writeUncommittedRepo(dir, SINGLE_PACKAGE_FILES_STUB);

  const dispose = async (): Promise<void> => {
    await rm(dir, { recursive: true, force: true, maxRetries: 5 });
  };
  const repo: SinglePackageRepo = { dir, dispose };

  return repo;
};
