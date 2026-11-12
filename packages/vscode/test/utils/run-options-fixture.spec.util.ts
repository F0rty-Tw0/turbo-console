import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { backdateTree } from './backdate.spec.util.ts';
import { packageDirOf, setScript } from './package-edit.spec.util.ts';
import { editJson } from './tree-polish-fixture.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { BACKDATE_MS } from '../common/launch.const.ts';
import { ARGS_SCRIPT, OPTIONS_PACKAGE, PRINT_ARGS_BODY, PRINT_ARGS_FILE, PRINT_ARGS_SCRIPT } from '../common/run-options.const.ts';

/**
 * Edits the launch's own fixture copy: `build` and a script no turbo.json names both write their argv to a file, so a run
 * shows what reached the script. Backdates every file and waits for the watcher to go quiet, all before the view is
 * revealed.
 */
export const prepareOptionsFixture = async (api: TurboConsoleApi, root: string): Promise<void> => {
  const dir = await packageDirOf(root, OPTIONS_PACKAGE);

  await writeFile(join(dir, PRINT_ARGS_FILE), PRINT_ARGS_BODY);
  await editJson(join(dir, 'package.json'), (manifest) => {
    setScript(manifest, 'build', PRINT_ARGS_SCRIPT);
    setScript(manifest, ARGS_SCRIPT, PRINT_ARGS_SCRIPT);
  });
  await backdateTree(root, BACKDATE_MS);
  await whenQuiet(api, root);
};
