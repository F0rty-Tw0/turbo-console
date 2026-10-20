import { join } from 'node:path';

import { backdateTree } from './backdate.spec.util.ts';
import { packageDirOf, setScript } from './package-edit.spec.util.ts';
import { editJson, writePackage } from './tree-polish-fixture.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { BACKDATE_MS } from '../common/launch.const.ts';
import {
  CHAIN_APP_SCRIPT,
  CHAIN_APP_SCRIPT_BODY,
  CHAIN_SCRIPT,
  CHAIN_SCRIPT_BODY,
  FAIL_SCRIPT,
  FAIL_SCRIPT_BODY,
  LONG_SCRIPT,
  LONG_SCRIPT_BODY,
  NOOP_SCRIPT_BODY,
  NUMBER_SCRIPT,
  NUMBER_SCRIPT_BODY,
  OK_SCRIPT,
  ROOT_SCRIPT,
  SCRIPTS_ONLY_FOLDER,
  SCRIPTS_ONLY_PACKAGE,
  SCRIPTS_PACKAGE
} from '../common/scripts.const.ts';

/**
 * Spec 1c-b §6.3: edits the launch's own fixture copy (six scripts on `SCRIPTS_PACKAGE`, a package of scripts only, a root
 * script), backdates every file, and waits for the watcher to go quiet, all before the view is revealed. Root keyed files
 * written later would cost a reload spawn and break case 3's count of host turbo spawns.
 */
export const prepareScriptsFixture = async (api: TurboConsoleApi, root: string): Promise<void> => {
  const dir = await packageDirOf(root, SCRIPTS_PACKAGE);

  await editJson(join(dir, 'package.json'), (manifest) => {
    setScript(manifest, OK_SCRIPT, NOOP_SCRIPT_BODY);
    setScript(manifest, FAIL_SCRIPT, FAIL_SCRIPT_BODY);
    setScript(manifest, LONG_SCRIPT, LONG_SCRIPT_BODY);
    setScript(manifest, NUMBER_SCRIPT, NUMBER_SCRIPT_BODY);
    setScript(manifest, CHAIN_SCRIPT, CHAIN_SCRIPT_BODY);
    setScript(manifest, CHAIN_APP_SCRIPT, CHAIN_APP_SCRIPT_BODY);
  });
  await writePackage(root, SCRIPTS_ONLY_FOLDER, SCRIPTS_ONLY_PACKAGE, {
    [OK_SCRIPT]: NOOP_SCRIPT_BODY,
    [LONG_SCRIPT]: LONG_SCRIPT_BODY
  });
  await editJson(join(root, 'package.json'), (manifest) => {
    manifest['scripts'] = { [ROOT_SCRIPT]: NOOP_SCRIPT_BODY };
  });
  await backdateTree(root, BACKDATE_MS);
  await whenQuiet(api, root);
};
