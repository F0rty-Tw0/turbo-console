import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { array, object, string } from 'zod';

import type { GuardInput } from './common/release.type.ts';
import { channelOf, guardProblems, isOnMaster, releaseNotes } from './utils/release.util.ts';

const MANIFEST_PATH = 'packages/vscode/package.json';
const CHANGELOG_PATH = 'packages/vscode/CHANGELOG.md';
const NOTES_PATH = 'release-notes.md';

const manifestSchema = object({ version: string() });
const runsSchema = array(object({ conclusion: string() }));

const git = (args: string[]): string => execFileSync('git', args, { encoding: 'utf8' }).trim();

const ANCESTRY_ARGS = ['merge-base', '--is-ancestor', 'HEAD', 'origin/master'];

const checkAncestry = (): void => {
  execFileSync('git', ANCESTRY_ARGS, { stdio: ['ignore', 'ignore', 'inherit'] });
};

const ciRunsOf = (sha: string): GuardInput['ciRuns'] => {
  const args = ['run', 'list', '--workflow', 'CI', '--commit', sha, '--event', 'push', '--json', 'conclusion'];
  const output = execFileSync('gh', args, { encoding: 'utf8' });

  return runsSchema.parse(JSON.parse(output));
};

const TAG_OPTION = { type: 'string' } as const;
const OPTIONS = { tag: TAG_OPTION };
const { values } = parseArgs({ options: OPTIONS });
const manifest = manifestSchema.parse(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));
const { version } = manifest;

if (values.tag !== undefined) {
  const input: GuardInput = {
    tag: values.tag,
    version,
    isAncestor: isOnMaster(checkAncestry),
    ciRuns: ciRunsOf(git(['rev-parse', 'HEAD']))
  };
  const problems = guardProblems(input);

  for (const problem of problems) console.error(problem);

  if (problems.length > 0) process.exit(1);
}

writeFileSync(NOTES_PATH, `${releaseNotes(readFileSync(CHANGELOG_PATH, 'utf8'), version)}\n`);

const outputFile = process.env['GITHUB_OUTPUT'];

if (outputFile !== undefined) appendFileSync(outputFile, `version=${version}\nchannel=${channelOf(version)}\n`);
