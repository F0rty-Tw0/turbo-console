import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { VSIX_FILES_PATH } from './common/vsix.const.ts';
import { listingFiles, packageArgs } from './package.util.ts';
import { vsixProblems } from './vsix-files.util.ts';

/** vsce's JS entry point. Node runs it directly: the bare `vsce` name is a `.cmd` shim on Windows that `execFile` cannot spawn. */
const vsceBin = (): string => {
  const require = createRequire(import.meta.url);
  const manifestPath = require.resolve('@vscode/vsce/package.json');

  return join(dirname(manifestPath), 'vsce');
};

const vsce = vsceBin();

mkdirSync('.vsix', { recursive: true });

const args = packageArgs(process.env);

execFileSync(process.execPath, [vsce, ...args], { stdio: 'inherit' });

const listing = execFileSync(process.execPath, [vsce, 'ls', '--no-dependencies'], { encoding: 'utf8' });

writeFileSync(VSIX_FILES_PATH, listing);

const files = listingFiles(listing);
const problems = vsixProblems(files);

for (const problem of problems) console.error(problem);

if (problems.length > 0) process.exit(1);

console.warn(`vsix ok: ${files.length} files`);
