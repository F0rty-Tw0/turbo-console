import { TOOL_ICON_PREFIX } from '@turbo-console/webview-ui';

import { binOf, delegationOf } from './delegation.util.ts';
import { FALLBACK_TOOL_BY_BIN, TOOL_BY_BIN } from '../common/tool.const.ts';
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

/** The expansions a call may still spend, and the first fallback tool it met; one is created per call. */
// eslint-disable-next-line local/readonly-type-properties -- one state shared by every recursive call of a resolve
type Walk = { left: number; fallback: ToolMatch | null };

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

/** What a segment runs: a known tool directly, the name of a script it delegates to, or nothing. */
type Target = ToolMatch | string | null;

/** A segment's target, and the fallback tool (`node`, `npm`) it runs when its target reaches no known tool. */
type Step = { readonly target: Target; readonly fallback: ToolSpec | null };

const NO_STEP: Step = { target: null, fallback: null };

const stepOf = (segment: string, scripts: PackageScripts): Step => {
  const tokens = segment.split(WHITESPACE);
  const index = candidateIndexOf(tokens);

  if (index === NO_CANDIDATE) return NO_STEP;

  const bin = binOf(tokens[index] ?? '');
  const tool = TOOL_BY_BIN.get(bin);
  const fallback = FALLBACK_TOOL_BY_BIN.get(bin) ?? null;

  if (tool !== undefined) {
    const match: ToolMatch = { tool, via: [] };
    const direct: Step = { target: match, fallback };

    return direct;
  }

  const name = delegationOf(tokens, index, scripts);
  const delegated: Step = { target: name, fallback };

  return delegated;
};

/** A delegation to a script name may be followed unless the name repeats on the path or the path already holds 5 names. */
const canFollow = (target: Target, path: string[]): target is string => {
  if (typeof target !== 'string') return false;

  const isOnPath = path.includes(target);
  const isTooDeep = path.length >= MAX_DELEGATIONS;

  return !isOnPath && !isTooDeep;
};

/** Keeps the first fallback met; a segment notes its own after its delegation, so a deeper one wins. */
const noteFallback = (fallback: ToolSpec | null, path: string[], walk: Walk): void => {
  const isFirst = walk.fallback === null;

  if (fallback !== null && isFirst) walk.fallback = { tool: fallback, via: path };
};

const resolveIn = (command: string, scripts: PackageScripts, path: string[], walk: Walk): ToolMatch | null => {
  for (const segment of segmentsOf(command)) {
    const { target, fallback } = stepOf(segment, scripts);
    const isDirect = target !== null && typeof target !== 'string';

    if (isDirect) return target;

    const isFollowable = canFollow(target, path);

    if (isFollowable) {
      walk.left -= 1;

      if (walk.left < 0) return null;

      const inner = resolveIn(scripts.bodies.get(target) ?? '', scripts, [...path, target], walk);

      if (inner !== null) {
        const match: ToolMatch = { tool: inner.tool, via: [target, ...inner.via] };

        return match;
      }
    }

    noteFallback(fallback, path, walk);
  }

  return null;
};

/**
 * Spec runner-chains §Behavior: the first command segment that resolves to a well-known tool, directly or through
 * same-package script delegations (at most 5, no repeats, at most 256 body expansions). With none, the first fallback
 * tool met, deepest first: `npm start` running `node x.js` is Node.js, `npm publish` is npm. Total and pure.
 */
export const resolveTool: ToolResolver = (command, scripts) => {
  if (command === null) return null;

  const walk: Walk = { left: MAX_EXPANSIONS, fallback: null };
  const match = resolveIn(command, scripts, [], walk);
  const isOverBudget = walk.left < 0;

  if (isOverBudget) return null;

  return match ?? walk.fallback;
};

/** The codicon id of the tool's logo, or `null` for a tool without a glyph. */
export const toolIconIdOf = (tool: ToolSpec): string | null => {
  if (tool.glyph === null) return null;

  return TOOL_ICON_PREFIX + tool.id;
};
