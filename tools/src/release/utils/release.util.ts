import type { GuardInput } from '../common/release.type.ts';

const HEADING_PREFIX = '## ';

/** Odd minor versions ship to the pre-release channel, even ones to stable. */
export const channelOf = (version: string): 'pre-release' | 'stable' => {
  const minor = Number.parseInt(version.split('.')[1] ?? '', 10);
  const isOdd = minor % 2 === 1;

  return isOdd ? 'pre-release' : 'stable';
};

const isSectionHeading = (line: string): boolean => line.startsWith(HEADING_PREFIX);

const isVersionHeading = (line: string, version: string): boolean => {
  const heading = `${HEADING_PREFIX}${version}`;

  return line === heading || line.startsWith(`${heading} `);
};

/** The CHANGELOG body under `## <version>` (a suffix like `(pre-release)` is allowed) up to the next `## ` heading; throws when the section is missing or empty. */
export const releaseNotes = (changelog: string, version: string): string => {
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => isVersionHeading(line, version));

  if (start === -1) throw new Error(`no CHANGELOG section for ${version}`);

  const rest = lines.slice(start + 1);
  const length = rest.findIndex(isSectionHeading);
  const end = length === -1 ? rest.length : length;
  const body = rest.slice(0, end);
  const notes = body.join('\n').trim();

  if (notes === '') throw new Error(`empty CHANGELOG section for ${version}`);

  return notes;
};

/** Reasons a tag must not publish: the tag differs from the manifest version, the commit is off master, or no CI push run passed. */
export const guardProblems = (input: GuardInput): string[] => {
  const problems: string[] = [];
  const expectedTag = `v${input.version}`;
  const hasSuccess = input.ciRuns.some((run) => run.conclusion === 'success');

  if (input.tag !== expectedTag) problems.push(`tag ${input.tag} does not match version ${input.version}`);

  if (!input.isAncestor) problems.push('commit is not on master');

  if (!hasSuccess) problems.push('no successful CI push run for this commit');

  return problems;
};

const NOT_ANCESTOR_STATUS = 1;

/** `git merge-base --is-ancestor` exits 1 for "not an ancestor"; any other failure (a missing ref exits 128) is not an answer. */
export const isNotAncestorError = (error: unknown): boolean => {
  return error instanceof Error && 'status' in error && error.status === NOT_ANCESTOR_STATUS;
};
