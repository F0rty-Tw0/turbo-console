import { isCode, jobsOf, stepsOf } from './workflow-lines.spec.util.ts';
import type { Job } from '../common/workflow.type.ts';

const PACKAGE_JOB = 'package';
const NO_JOB: Job = { name: '', lines: [] };
const STORE_JOBS = ['publish-marketplace', 'publish-openvsx'];
const INSTALL_LINE = 'run: pnpm install --frozen-lockfile --ignore-scripts';
const ENVIRONMENT_STORE = /^ {4}environment: store\s*$/;
const CACHE_LINE = /^\s*cache:|uses:\s*actions\/cache(?:\/[\w-]+)?@/;
const CACHE_OFF_LINE = 'package-manager-cache: false';
const GUARD_STEP_ID = 'id: release';
const GUARD_IF = `if [ "$IS_TAG" = 'true' ]; then`;
const GUARD_TAG_RUN = 'node tools/src/release/release.ts --tag "$TAG"';
const GUARD_LINES = ["IS_TAG: ${{ github.event_name == 'push' }}", 'TAG: ${{ github.ref_name }}', GUARD_IF];
const PRE_RELEASE_LINE = "VSCE_PRE_RELEASE: ${{ steps.release.outputs.channel == 'pre-release' && '1' || '0' }}";

const codeOf = (lines: string[]): string[] => lines.filter(isCode).map((line) => line.trim());

const jobNamed = (workflow: string, name: string): Job | undefined => jobsOf(workflow).find((job) => job.name === name);

const missingLines = (label: string, lines: string[], required: string[]): string[] => {
  const code = codeOf(lines);
  const missing = required.filter((line) => !code.includes(line));

  return missing.map((line) => `${label} lacks the line: ${line}`);
};

/** A tag push must run `release.ts --tag "$TAG"`, the only place the master and CI checks happen. */
export const tagGuardProblemsOf = (workflow: string): string[] => {
  const job = jobNamed(workflow, PACKAGE_JOB);
  const steps = stepsOf(job ?? NO_JOB);
  const step = steps.find((candidate) => codeOf(candidate).includes(GUARD_STEP_ID)) ?? [];
  const code = codeOf(step);
  const next = code[code.indexOf(GUARD_IF) + 1];
  const problems = missingLines('release guard step', step, GUARD_LINES);

  if (next !== GUARD_TAG_RUN) problems.push(`release guard step does not run right after the tag check: ${GUARD_TAG_RUN}`);

  return problems;
};

/** The vsix is built stable or pre-release from the same channel output the release page uses. */
export const preReleaseProblemsOf = (workflow: string): string[] => {
  const lines = jobNamed(workflow, PACKAGE_JOB)?.lines ?? [];

  return missingLines(PACKAGE_JOB, lines, [PRE_RELEASE_LINE]);
};

/** A job that holds a store token installs without lifecycle scripts, so a dependency cannot run code beside the token. */
export const installProblemsOf = (workflow: string): string[] => {
  const lacking = (name: string): string[] => missingLines(name, jobNamed(workflow, name)?.lines ?? [], [INSTALL_LINE]);

  return STORE_JOBS.flatMap(lacking);
};

const isStoreJob = (job: Job): boolean => job.lines.some((line) => isCode(line) && ENVIRONMENT_STORE.test(line));

const cacheProblemsOfJob = (job: Job): string[] => {
  const code = codeOf(job.lines);
  const restores = code.filter((line) => CACHE_LINE.test(line));
  const found = restores.map((line) => `${job.name} restores a cache: ${line}`);

  const missing = missingLines(job.name, job.lines, [CACHE_OFF_LINE]);

  return [...found, ...missing];
};

/** A job with `environment: store` restores no cache: a poisoned pnpm store would run its vsce or ovsx binary beside the token. */
export const cacheProblemsOf = (workflow: string): string[] => {
  const storeJobs = jobsOf(workflow).filter(isStoreJob);

  return storeJobs.flatMap(cacheProblemsOfJob);
};
