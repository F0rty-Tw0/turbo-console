import type { Job } from '../common/workflow.type.ts';

const JOBS_HEADER = /^jobs:\s*$/;
const JOB_HEADER = /^ {2}([\w-]+):\s*$/;
const STEP_START = /^ {6}- /;
const STEP_INDENT = 6;

export const isBlank = (line: string): boolean => line.trim() === '';

export const isComment = (line: string): boolean => line.trimStart().startsWith('#');

export const isCode = (line: string): boolean => !isComment(line);

export const indentOf = (line: string): number => line.length - line.trimStart().length;

const isJobsHeader = (line: string): boolean => JOBS_HEADER.test(line);

const isOutsideSteps = (line: string): boolean => !isBlank(line) && !isComment(line) && indentOf(line) < STEP_INDENT;

/** Splits the `jobs:` block into jobs by their two-space keys. */
export const jobsOf = (workflow: string): Job[] => {
  const lines = workflow.split('\n');
  const start = lines.findIndex(isJobsHeader);
  const jobs: Job[] = [];

  if (start < 0) return jobs;

  for (const line of lines.slice(start + 1)) {
    const name = JOB_HEADER.exec(line)?.[1];

    if (name !== undefined) jobs.push({ name, lines: [] });
    else jobs.at(-1)?.lines.push(line);
  }

  return jobs;
};

/** Splits one job body into steps by their `      - ` starts; a job key after `steps:` closes the last step. */
export const stepsOf = (job: Job): string[][] => {
  const steps: string[][] = [];

  for (const line of job.lines) {
    const isStart = STEP_START.test(line);
    const isOutside = isOutsideSteps(line);

    if (isStart) steps.push([line]);
    else if (isOutside) steps.push([]);
    else steps.at(-1)?.push(line);
  }

  return steps;
};
