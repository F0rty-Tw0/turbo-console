import { turboRunArgs } from '@turbo-console/core';
import type { TaskNode } from '@turbo-console/core';

import { BARE, BARE_FIRST_BLOCKED } from '../common/shell.const.ts';
import type { ShellKind } from '../common/shell.type.ts';

const PATH_SEPARATOR = /[\\/]/u;

/** `pwsh` or `powershell`, alone or as a preview, LTS or versioned build: `pwsh-preview`, `pwsh-lts`, `pwsh7`, `powershell-preview`. */
const PWSH_NAME = /^(?:pwsh|powershell)(?:-(?:preview|lts)|\d+(?:\.\d+)*)?$/u;

const POSIX_SPECIAL = /['\\]/gu;

/** PowerShell's tokenizer reads U+2018 to U+201B as single quotes too. */
const PWSH_QUOTES = /['\u2018-\u201B]/gu;

const PWSH_CMD_SPECIAL = /["&|<>^%!]/u;

const TRAILING_BACKSLASHES = /\\+$/u;

/** fish reads `\'` and `\\` inside single quotes, other POSIX shells do not: neither character stays inside, each sits between two quoted runs. */
const escapePosix = (special: string): string => (special === "'" ? "'\\''" : "'\\\\'");

const quotePosix = (arg: string): string => `'${arg.replace(POSIX_SPECIAL, escapePosix)}'`;

/**
 * `null` for `"`, cmd's metacharacters and a trailing `\`: Windows PowerShell and pwsh's legacy mode hand a `.cmd` shim
 * its arguments unquoted, and `cmd.exe /c` then re-splits them and runs `&`, `|`, `<`, `>`, `^`, `%` and `!`.
 */
const quotePwsh = (arg: string): string | null => {
  const hasCmdSpecial = PWSH_CMD_SPECIAL.test(arg);
  const endsInBackslash = arg.endsWith('\\');

  if (hasCmdSpecial || endsInBackslash) return null;

  return `'${arg.replace(PWSH_QUOTES, '$&$&')}'`;
};

/** `null` for `"`, `%` and `!`, which no quoting hides from cmd; trailing backslashes are doubled so the closing `"` stays one. */
const quoteCmd = (arg: string): string | null => {
  const hasQuote = arg.includes('"');
  const hasPercent = arg.includes('%');
  const hasBang = arg.includes('!');
  const isUnsafe = hasQuote || hasPercent || hasBang;

  if (isUnsafe) return null;

  return `"${arg.replace(TRAILING_BACKSLASHES, '$&$&')}"`;
};

const QUOTERS: Record<ShellKind, (arg: string) => string | null> = {
  posix: quotePosix,
  pwsh: quotePwsh,
  cmd: quoteCmd
};

const isQuoted = (arg: string | null): arg is string => arg !== null;

/** The user's terminal shell from `env.shell`: its basename, either separator, lowercased without `.exe`; unknown or empty is posix. */
export const shellKindOf = (shellPath: string): ShellKind => {
  const name = shellPath.split(PATH_SEPARATOR).pop() ?? '';
  const base = name.toLowerCase().replace(/\.exe$/u, '');

  const isPwsh = PWSH_NAME.test(base);

  if (isPwsh) return 'pwsh';

  return base === 'cmd' ? 'cmd' : 'posix';
};

/** `arg` as one word of `kind`'s command line; `null` when `kind` cannot pass it safely. */
export const quoteArg = (arg: string, kind: ShellKind): string | null => {
  const isBareChars = BARE.test(arg);
  const startsBlocked = BARE_FIRST_BLOCKED.test(arg);
  const isBare = isBareChars && !startsBlocked;

  if (isBare) return arg;

  return QUOTERS[kind](arg);
};

/**
 * The command a user would type to run `task` in `packageName`, quoted for `kind`; `null` when an argument cannot be
 * quoted. Throws what `turboRunArgs` throws for a task or package name turbo could misread.
 */
export const copyText = (task: TaskNode, packageName: string, kind: ShellKind): string | null => {
  turboRunArgs(task, packageName);

  const args = ['turbo', 'run', task.name, `--filter=${packageName}`];
  const quoted = args.map((arg) => quoteArg(arg, kind));
  const words = quoted.filter(isQuoted);

  if (words.length !== quoted.length) return null;

  return words.join(' ');
};
