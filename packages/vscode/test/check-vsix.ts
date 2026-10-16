import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { VSIX_FILES_PATH } from './common/vsix.const.ts';
import { vsixProblems } from './utils/vsix-files.spec.util.ts';

const listing = readFileSync(resolve(import.meta.dirname, '..', VSIX_FILES_PATH), 'utf8');
const lines = listing.split('\n');
const trimmed = lines.map((line) => line.trim());
const files = trimmed.filter((line) => line !== '');
const problems = vsixProblems(files);

for (const problem of problems) console.error(problem);

if (problems.length > 0) process.exit(1);

console.warn(`vsix ok: ${files.length} files`);
