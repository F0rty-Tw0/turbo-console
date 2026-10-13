import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { turboBinaryCandidates } from '../../../shared/turbo/utils/turbo-platform.util.ts';

const CANDIDATES = turboBinaryCandidates(process.platform, process.arch);

/** The scoped platform package's binary (`@turbo/<os>-<arch>/bin/turbo[.exe]`), relative to a `node_modules` dir. */
export const SCOPED_BINARY = CANDIDATES[0] ?? 'no-scoped-package';

/** The legacy platform package's binary (`turbo-<os>-<arch>/bin/turbo[.exe]`), relative to a `node_modules` dir. */
export const LEGACY_BINARY = CANDIDATES[1] ?? 'no-legacy-package';

export const TURBO_MANIFEST = JSON.stringify({ name: 'turbo', version: '2.11.7' });

/** `<root>/node_modules/turbo/package.json`, the only manifest `resolveTurbo` reads. */
export const manifestPathOf = (root: string): string => join(root, 'node_modules', 'turbo', 'package.json');

export const writeFileIn = async (path: string, text: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text);
};

/** An empty file at `<nodeModules>/<SCOPED_BINARY>`; returns its path. */
export const installPlatformBinary = async (nodeModules: string): Promise<string> => {
  const binary = join(nodeModules, SCOPED_BINARY);

  await writeFileIn(binary, '');

  return binary;
};

/** A workspace root holding only `package.json` (`{}`), plus `manifest` as its turbo manifest when given. */
export const workspaceAt = async (root: string, manifest?: string): Promise<string> => {
  await writeFileIn(join(root, 'package.json'), '{}');

  if (manifest !== undefined) await writeFileIn(manifestPathOf(root), manifest);

  return root;
};
