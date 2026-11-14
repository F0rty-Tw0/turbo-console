import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

import { listingFiles, packageArgs, vsceBin } from './package.util.ts';
import { VSIX_FILES_PATH } from '../test/common/vsix.const.ts';
import { vsixProblems } from '../test/utils/vsix-files.spec.util.ts';

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
