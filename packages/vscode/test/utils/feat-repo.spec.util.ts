import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';

import { applyEdit, checkoutBranch } from '@turbo-console/repo-gen';
import type { FixtureSpec } from '@turbo-console/repo-gen';

import { affectedEditsOf } from './affected-edits.spec.util.ts';
import { copyFixture } from './fixture-copy.spec.util.ts';
import { readManifestFile } from './suite-input.spec.util.ts';
import { folderWorkspace, workspaceDirOf } from './workspace.spec.util.ts';
import { FEAT_BRANCH, README_FILE, SOURCE_FILE, UNCOMMITTED_LINE } from '../common/affected.const.ts';
import type { LaunchName, PreparedWorkspace, RunScratch, WorkspacePrep } from '../common/launch.type.ts';

/** The options of `featRepoOf`: whether the leaf package also gets an edit left uncommitted. */
type FeatRepoOptions = {
  readonly uncommitted: boolean;
};

/**
 * A workspace prep: a copy of `spec` on branch `feat` (the fixture starts on `main`) with a README commit in the `readme`
 * package of the edit set, and with `uncommitted` an `UNCOMMITTED_LINE` appended to the `leaf` package's `src/index.ts`
 * and left in the working tree. The packages come from `affectedEditsOf` over the run's fixture manifest.
 */
export const featRepoOf = (spec: FixtureSpec, options: FeatRepoOptions): WorkspacePrep => {
  const prepare = async (scratch: RunScratch, name: LaunchName): Promise<PreparedWorkspace> => {
    const dir = workspaceDirOf(scratch, name);
    const manifest = await readManifestFile(scratch.manifestFile);
    const { readme, leaf } = affectedEditsOf(manifest);

    await copyFixture(dir, spec);
    await checkoutBranch(dir, FEAT_BRANCH);
    await applyEdit(dir, [`${readme.path}/${README_FILE}`]);

    if (options.uncommitted) await appendFile(join(dir, leaf.path, SOURCE_FILE), UNCOMMITTED_LINE);

    return folderWorkspace(dir);
  };

  return prepare;
};
