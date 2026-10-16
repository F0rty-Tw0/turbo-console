import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { backdateTree } from './backdate.spec.util.ts';
import { addTask, packageDirOf, setScript, writeEdited } from './package-edit.spec.util.ts';
import { whenQuiet } from './watch-wait.spec.util.ts';
import type { TurboConsoleApi } from '../../src/shared/common/api.type.ts';
import { BACKDATE_MS } from '../common/launch.const.ts';
import { DEV_CONFIG, DEV_SCRIPT, DUP_PACKAGE, EMPTY_PACKAGE, POLISH_PACKAGE } from '../common/tree-polish.const.ts';

type JsonObject = Record<string, unknown>;

const NOOP_SCRIPT = 'node -e 0';

const editJson = async (file: string, edit: (manifest: JsonObject) => void): Promise<void> => {
  const original = await readFile(file, 'utf8');

  await writeEdited(file, original, edit);
};

const writePackage = async (root: string, folder: string, name: string, scripts: Record<string, string>): Promise<void> => {
  const dir = join(root, 'packages', folder);
  const manifest = { name, private: true, version: '0.0.0', scripts };

  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
};

/**
 * Spec 1c-a §6.4: edits the launch's own fixture copy (root `dev`, `@fx/pkg-001`'s `dev` and `zz-adhoc`, a package with
 * no script, a second `pkg-001` under another scope), backdates every file, and waits for the watcher to go quiet, all
 * before the view is revealed. Case 5's HIT needs every input settled before its first run.
 */
export const prepareFixture = async (api: TurboConsoleApi, root: string): Promise<void> => {
  const dir = await packageDirOf(root, POLISH_PACKAGE);

  await editJson(join(root, 'turbo.json'), (turbo) => {
    addTask(turbo, 'dev', { ...DEV_CONFIG });
  });
  await editJson(join(dir, 'package.json'), (manifest) => {
    setScript(manifest, 'dev', DEV_SCRIPT);
    setScript(manifest, 'zz-adhoc', NOOP_SCRIPT);
  });
  await writePackage(root, 'zz-empty', EMPTY_PACKAGE, {});
  await writePackage(root, 'zz-dup', DUP_PACKAGE, { build: NOOP_SCRIPT });
  await backdateTree(root, BACKDATE_MS);
  await whenQuiet(api, root);
};
