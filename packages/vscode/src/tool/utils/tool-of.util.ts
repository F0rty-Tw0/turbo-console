import { TOOL_ICON_PREFIX } from '@turbo-console/webview-ui';

import { TOOL_BY_BIN } from '../common/tool.const.ts';
import type { ToolSpec } from '../common/tool.type.ts';

const SEGMENT_END = /&&|\|\|?|;/;
const WHITESPACE = /\s+/;
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const PATH_PREFIX = /^.*[/\\]/;
const BIN_SUFFIX = /\.(?:cmd|exe|js)$/;
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

const candidateOf = (tokens: string[]): string | null => {
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const next = tokens[index + 1] ?? '';
    const length = skipLengthOf(token, next, index > 0);

    if (length === 0) return token;
    index += length;
  }

  return null;
};

const binOf = (candidate: string): string => candidate.toLowerCase().replace(PATH_PREFIX, '').replace(BIN_SUFFIX, '');

/** Spec 1c-c §4.2: the well-known tool the first command segment runs, or `null`. Total and pure. */
export const toolOf = (command: string | null): ToolSpec | null => {
  if (command === null) return null;

  const [segment = ''] = command.split(SEGMENT_END);
  const candidate = candidateOf(segment.trim().split(WHITESPACE));

  if (candidate === null) return null;

  return TOOL_BY_BIN.get(binOf(candidate)) ?? null;
};

/** The codicon id of the tool's logo, or `null` for a tool without a glyph. */
export const toolIconIdOf = (tool: ToolSpec): string | null => {
  if (tool.glyph === null) return null;

  return TOOL_ICON_PREFIX + tool.id;
};
