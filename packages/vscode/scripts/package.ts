import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { VSIX_DIR, VSIX_FILES_PATH, VSIX_PATH } from './common/vsix.const.ts';
import { listingFiles, packageArgs } from './package.util.ts';
import { vsixProblems } from './vsix-files.util.ts';

/** vsce's JS entry point. Node runs it directly: the bare `vsce` name is a `.cmd` shim on Windows that `execFile` cannot spawn. */
const vsceBin = (): string => {
  const require = createRequire(import.meta.url);
  const manifestPath = require.resolve('@vscode/vsce/package.json');

  return join(dirname(manifestPath), 'vsce');
};

const PACKAGE_ROOT = resolve(import.meta.dirname, '..');

const vsce = vsceBin();

mkdirSync(resolve(PACKAGE_ROOT, VSIX_DIR), { recursive: true });

const args = packageArgs(process.env);

execFileSync(process.execPath, [vsce, ...args], { cwd: PACKAGE_ROOT, stdio: 'inherit' });

const listing = execFileSync(process.execPath, [vsce, 'ls', '--no-dependencies'], { cwd: PACKAGE_ROOT, encoding: 'utf8' });

writeFileSync(resolve(PACKAGE_ROOT, VSIX_FILES_PATH), listing);

const files = listingFiles(listing);
const problems = vsixProblems(files);

for (const problem of problems) console.error(problem);

if (problems.length > 0) {
  rmSync(resolve(PACKAGE_ROOT, VSIX_PATH), { force: true });
  process.exit(1);
}

console.warn(`vsix ok: ${files.length} files`);
