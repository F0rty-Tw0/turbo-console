import { indentOf, isBlank, isCode } from './workflow-lines.spec.util.ts';

const RUN = /^(\s*)(- )?run:\s*(.*)$/;
const TOKEN = /\b(VSCE_PAT|OVSX_PAT)\b/;
const STEP_ENV = /^ {8}env:\s*$/;

const isTokenLine = (line: string): boolean => isCode(line) && TOKEN.test(line);

const isShallowerThan = (line: string, indent: number): boolean => !isBlank(line) && indentOf(line) < indent;

const endsBlock = (line: string, keyIndent: number): boolean => !isBlank(line) && indentOf(line) <= keyIndent;

/**
 * The lines of every `run:` body: the inline value plus every line indented deeper than the key. That covers a block
 * scalar under any header (`|2`, `| # note`, `>-`) and a plain value continued on the next lines.
 */
const runBodiesOf = (lines: string[]): string[] => {
  const bodies: string[] = [];

  lines.forEach((line, index) => {
    const match = RUN.exec(line);

    if (match === null) return;

    const keyIndent = (match[1]?.length ?? 0) + (match[2] === undefined ? 0 : 2);
    const inline = match[3] ?? '';
    const rest = lines.slice(index + 1);
    const end = rest.findIndex((next) => endsBlock(next, keyIndent));
    const head = rest.slice(0, end);
    const block = end < 0 ? rest : head;

    bodies.push(inline, ...block);
  });

  return bodies;
};

export const injectionProblemsOf = (workflow: string): string[] => {
  const bodies = runBodiesOf(workflow.split('\n'));
  const injected = bodies.filter((line) => line.includes('${{'));

  return injected.map((line) => `run body holds an expression: ${line.trim()}`);
};

const isOutsideStepEnv = (lines: string[], index: number): boolean => {
  const indent = indentOf(lines[index] ?? '');
  const parent = lines.slice(0, index).findLast((line) => isShallowerThan(line, indent));

  return parent === undefined || !STEP_ENV.test(parent);
};

export const tokenProblemsOf = (workflow: string): string[] => {
  const lines = workflow.split('\n');
  const indexes = Array.from(lines.keys()).filter((index) => isTokenLine(lines[index] ?? ''));
  const stray = indexes.filter((index) => isOutsideStepEnv(lines, index));

  return stray.map((index) => `token outside a step-level env: ${lines[index]?.trim()}`);
};
