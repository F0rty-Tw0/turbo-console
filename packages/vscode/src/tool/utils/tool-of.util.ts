import { TOOL_ICON_PREFIX } from '@turbo-console/webview-ui';

import { binOf, delegationOf } from './delegation.util.ts';
import { TOOL_BY_BIN } from '../common/tool.const.ts';
import type { PackageScripts, ToolMatch, ToolResolver, ToolSpec } from '../common/tool.type.ts';

const SEGMENT_END = /&&|\||;/;
const WHITESPACE = /\s+/;
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const SKIPPED_TOKENS: string[] = ['cross-env', 'env', 'npx', 'bunx', '--'];
const MANAGERS: string[] = ['pnpm', 'npm', 'yarn', 'bun'];
const RUNNER_VERBS: string[] = ['exec', 'dlx'];

/** How many tokens a wrapper takes from the front: 0 means `token` is the candidate binary. */
const skipLengthOf = (token: string, next: string, afterSkip: boolean): number => {
  const isSkippedToken = SKIPPED_TOKENS.includes(token);
  const isEnvAssignment = ENV_ASSIGNMENT.test(token);
  const isManager = MANAGERS.includes(token);
  const isRunnerVerb = RUNNER_VERBS.includes(next);
  const isDashed = token.startsWith('-');
  const isWrapper = isSkippedToken || isEnvAssignment;
  const isRunner = isManager && isRunnerVerb;
  const isOption = afterSkip && isDashed;

  if (isWrapper || isOption) return 1;

  if (isRunner) return 2;

  return 0;
};

const NO_CANDIDATE = -1;
const MAX_DELEGATIONS = 5;
/**
 * Script bodies one `resolveTool` call may expand. The cycle and depth limits bound a path, not the paths: scripts that
 * each run all the others multiply them without end, so a call past this budget gives up and resolves to null.
 */
const MAX_EXPANSIONS = 256;

/** The expansions a call may still spend; one is created per call. */
// eslint-disable-next-line local/readonly-type-properties -- one counter shared by every recursive call of a resolve
type Budget = { left: number };

const candidateIndexOf = (tokens: string[]): number => {
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const next = tokens[index + 1] ?? '';
    const length = skipLengthOf(token, next, index > 0);

    if (length === 0) return index;
    index += length;
  }

  return NO_CANDIDATE;
};

const segmentsOf = (command: string): string[] => {
  const parts = command.split(SEGMENT_END);
  const trimmed = parts.map((part) => part.trim());

  return trimmed.filter((part) => part !== '');
};

/** What a segment runs: a tool directly, the name of a script it delegates to, or nothing. */
type Step = ToolMatch | string | null;

const stepOf = (segment: string, scripts: PackageScripts): Step => {
  const tokens = segment.split(WHITESPACE);
  const index = candidateIndexOf(tokens);

  if (index === NO_CANDIDATE) return null;

  const tool = TOOL_BY_BIN.get(binOf(tokens[index] ?? ''));

  if (tool !== undefined) {
    const direct: ToolMatch = { tool, via: [] };

    return direct;
  }

  return delegationOf(tokens, index, scripts);
};

/** A delegation to `name` may be followed unless `name` repeats on the path or the path already holds 5 names. */
const canFollow = (name: string, path: string[]): boolean => {
  const isOnPath = path.includes(name);
  const isTooDeep = path.length >= MAX_DELEGATIONS;

  return !isOnPath && !isTooDeep;
};

const resolveIn = (command: string, scripts: PackageScripts, path: string[], budget: Budget): ToolMatch | null => {
  for (const segment of segmentsOf(command)) {
    const step = stepOf(segment, scripts);

    if (step === null) continue;

    if (typeof step !== 'string') return step;

    const isFollowable = canFollow(step, path);

    if (!isFollowable) continue;

    budget.left -= 1;

    if (budget.left < 0) return null;

    const inner = resolveIn(scripts.bodies.get(step) ?? '', scripts, [...path, step], budget);

    if (inner === null) continue;

    const match: ToolMatch = { tool: inner.tool, via: [step, ...inner.via] };

    return match;
  }

  return null;
};

/**
 * Spec runner-chains §Behavior: the first command segment that resolves to a well-known tool, directly or through
 * same-package script delegations (at most 5, no repeats, at most 256 body expansions). Total and pure.
 */
export const resolveTool: ToolResolver = (command, scripts) => {
  if (command === null) return null;

  const budget: Budget = { left: MAX_EXPANSIONS };
  const match = resolveIn(command, scripts, [], budget);
  const isOverBudget = budget.left < 0;

  if (isOverBudget) return null;

  return match;
};

/** The codicon id of the tool's logo, or `null` for a tool without a glyph. */
export const toolIconIdOf = (tool: ToolSpec): string | null => {
  if (tool.glyph === null) return null;

  return TOOL_ICON_PREFIX + tool.id;
};
