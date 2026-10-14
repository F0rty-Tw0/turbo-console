import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { backdateTree } from './backdate.spec.util.ts';

/** How long before now every file of a `newRoot` fixture was last written. */
export const AGE_MS = 10_000;

/**
 * A new workspace root under `parent` holding a root `package.json` and `turbo.json` and an `a` manifest, all last
 * written `AGE_MS` ago, so a following store sees no keyed file written during its spawn.
 */
export const newRoot = async (parent: string): Promise<string> => {
  const root = await mkdtemp(join(parent, 'case-'));

  await mkdir(join(root, 'a'));
  await writeFile(join(root, 'package.json'), '{}');
  await writeFile(join(root, 'turbo.json'), '{"tasks":{}}');
  await writeFile(join(root, 'a', 'package.json'), '{}');
  await backdateTree(root, AGE_MS);

  return root;
};
