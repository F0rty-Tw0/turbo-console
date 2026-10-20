import { BUILTINS_BY_MANAGER, CROSS_PACKAGE_FLAGS, GLUED_FLAGS, NPM_LIFECYCLE, TURBO_BUILTINS } from '../common/delegation.const.ts';
import type { PackageScripts } from '../common/tool.type.ts';

const PATH_PREFIX = /^.*[/\\]/;
const BIN_SUFFIX = /\.(?:cmd|exe|js)$/;
const ARGS_END = '--';
const RUN_VERBS: string[] = ['run', 'run-script'];
const RUN_WORD = 'run';
const TURBO_WORD = 'turbo';

/** A token's lower-case binary name: no directory, no `.cmd`/`.exe`/`.js` suffix. */
export const binOf = (candidate: string): string => candidate.toLowerCase().replace(PATH_PREFIX, '').replace(BIN_SUFFIX, '');

const isSkippableOption = (token: string | undefined): boolean => {
  if (token === undefined) return false;

  return token.startsWith('-') && token !== ARGS_END;
};

const optionsEndOf = (tokens: string[], from: number): number => {
  let index = from;

  while (isSkippableOption(tokens[index])) index += 1;

  return index;
};

const argsEndOf = (tokens: string[], from: number): number => {
  const separator = tokens.indexOf(ARGS_END, from);

  if (separator === -1) return tokens.length;

  return separator;
};

const isCrossPackageFlag = (token: string): boolean => {
  const [flag = ''] = token.split('=');
  const isListed = CROSS_PACKAGE_FLAGS.has(token);
  const isListedWithValue = token.includes('=') && CROSS_PACKAGE_FLAGS.has(flag);
  const isGluedValue = token.length > 2 && GLUED_FLAGS.includes(token.slice(0, 2));

  return isListed || isListedWithValue || isGluedValue;
};

const hasCrossPackageFlag = (tokens: string[], start: number): boolean => {
  const scope = tokens.slice(0, argsEndOf(tokens, start));

  return scope.some(isCrossPackageFlag);
};

const npmNameOf = (tokens: string[], from: number): string | null => {
  const verbIndex = optionsEndOf(tokens, from);
  const verb = tokens[verbIndex] ?? '';

  const isRunVerb = RUN_VERBS.includes(verb);
  const isLifecycle = NPM_LIFECYCLE.includes(verb);

  if (isRunVerb) return tokens[optionsEndOf(tokens, verbIndex + 1)] ?? null;

  if (isLifecycle) return verb;

  return null;
};

const managerNameOf = (tokens: string[], manager: string, from: number): string | null => {
  const wordIndex = optionsEndOf(tokens, from);
  const word = tokens[wordIndex];

  if (word === undefined) return null;

  if (word === RUN_WORD) return tokens[optionsEndOf(tokens, wordIndex + 1)] ?? null;

  const isBuiltin = BUILTINS_BY_MANAGER.get(manager)?.has(word) ?? false;

  if (isBuiltin) return null;

  return word;
};

const valueLengthOf = (option: string, next: string | undefined): number => {
  const hasInlineValue = option.includes('=');
  const isNextOption = next?.startsWith('-') ?? true;
  const hasNextValue = !isNextOption && next !== RUN_WORD;

  if (hasInlineValue || !hasNextValue) return 0;

  return 1;
};

const positionalsOf = (args: string[]): string[] => {
  const words: string[] = [];
  let index = 0;

  while (index < args.length) {
    const token = args[index] ?? '';
    const isOption = token.startsWith('-');

    if (!isOption) words.push(token);
    index += 1;

    if (isOption) index += valueLengthOf(token, args[index]);
  }

  return words;
};

const turboNameOf = (tokens: string[], from: number): string | null => {
  const words = positionalsOf(tokens.slice(from, argsEndOf(tokens, from)));
  const [first = '', ...rest] = words;
  const isRun = first === RUN_WORD;
  const isBuiltin = TURBO_BUILTINS.has(first);
  const tasks = isRun ? rest : words;

  if (isBuiltin) return null;

  if (tasks.length !== 1) return null;

  return tasks[0] ?? null;
};

/** Pin A: `<pm> turbo` runs a `turbo` script when the package has one; otherwise the manager runs the turbo bin. */
const restartsAtTurbo = (tokens: string[], index: number, scripts: PackageScripts): boolean => {
  const isManager = BUILTINS_BY_MANAGER.has(binOf(tokens[index] ?? ''));
  const word = tokens[optionsEndOf(tokens, index + 1)];
  const isTurboWord = word === TURBO_WORD;
  const hasTurboScript = scripts.bodies.has(TURBO_WORD);

  return isManager && isTurboWord && !hasTurboScript;
};

const nameAt = (tokens: string[], index: number, scripts: PackageScripts): string | null => {
  const bin = binOf(tokens[index] ?? '');
  const isManager = BUILTINS_BY_MANAGER.has(bin);
  const restarts = restartsAtTurbo(tokens, index, scripts);

  if (bin === TURBO_WORD && scripts.followTurbo) return turboNameOf(tokens, index + 1);

  if (bin === 'npm') return npmNameOf(tokens, index + 1);

  if (restarts) return nameAt(tokens, optionsEndOf(tokens, index + 1), scripts);

  if (isManager) return managerNameOf(tokens, bin, index + 1);

  return null;
};

/**
 * The same-package script a command segment delegates to, or `null`. `tokens` is the whole segment, `start` the candidate
 * index (wrappers before it already skipped); the name is always a key of `scripts.bodies`. Total and pure.
 */
export const delegationOf = (tokens: string[], start: number, scripts: PackageScripts): string | null => {
  const isCrossPackage = hasCrossPackageFlag(tokens, start);

  if (isCrossPackage) return null;

  const name = nameAt(tokens, start, scripts);
  const hasScript = scripts.bodies.has(name ?? '');
  const isKnown = name !== null && hasScript;

  if (!isKnown) return null;

  return name;
};
