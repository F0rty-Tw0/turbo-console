import { indentOf, isBlank, isCode, jobsOf, stepsOf } from './workflow-lines.spec.util.ts';

const USES = /^\s*(?:- )?uses:\s*(\S+)/;
const PINNED = /^([\w.-]+\/[\w.-]+)@[0-9a-f]{40}$/;
const SHA_COMMENT = /^\s*# SHA = ([\w.-]+\/[\w.-]+)@v\S+/;
const PERMISSIONS = /^permissions:\s*$/;
const WRITE = /^\s*contents: write\s*$/;
const GITHUB_RELEASE = 'github-release';

const usesOf = (line: string): string | null => USES.exec(line)?.[1] ?? null;

const isUses = (line: string): boolean => usesOf(line) !== null;

/** Walks up the blank-line-bounded block to the nearest `# SHA = ` comment, stopping at a previous `uses:`. */
const shaCommentRepoAbove = (lines: string[], index: number): string | null => {
  for (let i = index - 1; i >= 0; i -= 1) {
    const line = lines[i] ?? '';
    const repo = SHA_COMMENT.exec(line)?.[1];

    if (repo !== undefined) return repo;

    const isBlankLine = isBlank(line);
    const isUsesLine = isUses(line);

    if (isBlankLine || isUsesLine) return null;
  }

  return null;
};

const usesProblemOf = (lines: string[], index: number): string | null => {
  const value = usesOf(lines[index] ?? '') ?? '';
  const repo = PINNED.exec(value)?.[1];

  if (repo === undefined) return `uses is not <owner>/<repo>@<40-hex>: ${value}`;

  const commented = shaCommentRepoAbove(lines, index);

  return commented === repo ? null : `uses ${value} lacks a matching "# SHA = ${repo}@v…" comment`;
};

export const usesProblemsOf = (workflow: string): string[] => {
  const lines = workflow.split('\n');
  const indexes = Array.from(lines.keys()).filter((index) => isUses(lines[index] ?? ''));
  const problems = Array.from(indexes, (index) => usesProblemOf(lines, index));

  return problems.filter((problem) => problem !== null);
};

const topPermissionsOf = (workflow: string): string[] => {
  const lines = workflow.split('\n');
  const start = lines.findIndex((line) => PERMISSIONS.test(line));

  if (start < 0) return [];

  const body = lines.slice(start + 1);
  const end = body.findIndex((line) => !isBlank(line) && indentOf(line) === 0);
  const head = body.slice(0, end);
  const block = end < 0 ? body : head;

  const entries = block.filter((line) => isCode(line) && !isBlank(line));

  return entries.map((line) => line.trim());
};

export const permissionProblemsOf = (workflow: string): string[] => {
  const problems: string[] = [];
  const top = topPermissionsOf(workflow).join(', ');
  const jobs = jobsOf(workflow);
  const writers = jobs.filter((job) => job.lines.some((line) => WRITE.test(line)));
  const lines = workflow.split('\n');
  const writes = lines.filter((line) => WRITE.test(line));
  const writerNames = writers.map((job) => job.name).join(', ');

  if (top !== 'contents: read') problems.push(`top-level permissions is not exactly contents: read: ${top}`);

  if (writes.length !== 1) problems.push(`contents: write appears ${writes.length} times, expected 1`);

  if (writerNames !== GITHUB_RELEASE) problems.push(`contents: write sits in: ${writerNames}`);

  return problems;
};

export const storeProblemsOf = (workflow: string, jobName: string, variable: string): string[] => {
  const job = jobsOf(workflow).find((candidate) => candidate.name === jobName);
  const jobLines = job?.lines ?? [];
  const lines = jobLines.filter(isCode);
  const hasStore = lines.some((line) => /^ {4}environment: store\s*$/.test(line));
  const hasVar = lines.some((line) => /^ {4}if:/.test(line) && line.includes(`vars.${variable} == 'true'`));
  const problems: string[] = [];

  if (!hasStore) problems.push(`${jobName} lacks environment: store`);

  if (!hasVar) problems.push(`${jobName} lacks an if: with vars.${variable} == 'true'`);

  return problems;
};

export const checkoutProblemsOf = (workflow: string): string[] => {
  const steps = jobsOf(workflow).flatMap(stepsOf);
  const checkouts = steps.filter((step) => step.some((line) => usesOf(line)?.startsWith('actions/checkout@')));
  const unsafe = checkouts.filter((step) => !step.some((line) => line.trim() === 'persist-credentials: false'));

  return unsafe.map((step) => `checkout step lacks persist-credentials: false: ${step[0]}`);
};
