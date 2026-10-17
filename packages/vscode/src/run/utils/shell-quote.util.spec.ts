import { TurboException } from '@turbo-console/core';
import { describe, expect, it } from 'vitest';

import { copyText, quoteArg, shellKindOf } from './shell-quote.util.ts';
import { TASK_NODE_STUB } from '../../tree/test/stubs/workspace-model.stub.ts';
import type { ShellKind } from '../common/shell.type.ts';

const BARE_ARGS = ['turbo', 'run', 'build', '--filter=@scope/pkg', 'a.b_c-d:e=f+g', 'x/y'];

type Quoted = [string, string | null];

const POSIX_QUOTED: Quoted[] = [
  ['a b', "'a b'"],
  ['a$b', "'a$b'"],
  ['a`b', "'a`b'"],
  ['a!b', "'a!b'"],
  ['a&b', "'a&b'"],
  ['a#b', "'a#b'"],
  ['#build', "'#build'"],
  ["a'b", "'a'\\''b'"],
  ['a"b', "'a\"b'"],
  ['a%b', "'a%b'"],
  ['a\\b', "'a'\\\\'b'"],
  ['a\\', "'a'\\\\''"],
  ["x\\';echo PWNED;\\", "'x'\\\\''\\'';echo PWNED;'\\\\''"],
  ['', "''"]
];

const PWSH_QUOTED: Quoted[] = [
  ['a b', "'a b'"],
  ['a$b', "'a$b'"],
  ['a`b', "'a`b'"],
  ['a!b', null],
  ['a&b', null],
  ['a#b', "'a#b'"],
  ["a'b", "'a''b'"],
  ['a\u2018b', "'a\u2018\u2018b'"],
  ['a\u2019b', "'a\u2019\u2019b'"],
  ['a\u201Ab', "'a\u201A\u201Ab'"],
  ['a\u201Bb', "'a\u201B\u201Bb'"],
  ['x\u2019$(calc)\u2019', "'x\u2019\u2019$(calc)\u2019\u2019'"],
  ['a\\b', "'a\\b'"],
  ['a"b', null],
  ['a\\', null],
  ['a|b', null],
  ['a<b', null],
  ['a>b', null],
  ['a^b', null],
  ['a%b', null],
  ['', "''"]
];

const CMD_QUOTED: Quoted[] = [
  ['a b', '"a b"'],
  ['a$b', '"a$b"'],
  ['a`b', '"a`b"'],
  ['a&b', '"a&b"'],
  ['a#b', '"a#b"'],
  ["a'b", '"a\'b"'],
  ['a\\b', '"a\\b"'],
  ['x\\', '"x\\\\"'],
  ['x\\\\', '"x\\\\\\\\"'],
  ['a"b', null],
  ['a%b', null],
  ['a!b', null],
  ['', '""']
];

const LEADING_ARGS = ['=build', '@scope/pkg'];

describe('FEATURE: shell quoting', () => {
  describe('shellKindOf', () => {
    it.each<[string, ShellKind]>([
      ['/usr/bin/zsh', 'posix'],
      ['/bin/bash', 'posix'],
      ['/usr/bin/fish', 'posix'],
      ['C:\\Program Files\\PowerShell\\7\\pwsh.exe', 'pwsh'],
      ['C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', 'pwsh'],
      ['PWSH', 'pwsh'],
      ['/usr/bin/pwsh-preview', 'pwsh'],
      ['/usr/bin/pwsh-lts', 'pwsh'],
      ['/usr/local/bin/pwsh7', 'pwsh'],
      ['C:\\Program Files\\PowerShell\\7-preview\\powershell-preview.exe', 'pwsh'],
      ['/usr/bin/pwshell-not', 'posix'],
      ['/usr/bin/powershellx', 'posix'],
      ['/usr/bin/pwsh-wrapper.sh', 'posix'],
      ['C:\\Windows\\System32\\cmd.exe', 'cmd'],
      ['cmd', 'cmd'],
      ['/opt/weird/shell', 'posix'],
      ['', 'posix']
    ])('GIVEN the shell path %j WHEN its kind is read THEN it is %s', (shellPath, kind) => {
      const found = shellKindOf(shellPath);

      expect(found).toBe(kind);
    });
  });

  describe('quoteArg', () => {
    describe.each<ShellKind>(['posix', 'pwsh', 'cmd'])('GIVEN the %s shell', (kind) => {
      it.each(BARE_ARGS)('WHEN %j is quoted THEN it stays bare', (arg) => {
        const quoted = quoteArg(arg, kind);

        expect(quoted).toBe(arg);
      });
    });

    it.each(POSIX_QUOTED)('GIVEN the posix shell WHEN %j is quoted THEN it is %j', (arg, expected) => {
      const quoted = quoteArg(arg, 'posix');

      expect(quoted).toBe(expected);
    });

    it.each(PWSH_QUOTED)('GIVEN the pwsh shell WHEN %j is quoted THEN it is %j', (arg, expected) => {
      const quoted = quoteArg(arg, 'pwsh');

      expect(quoted).toBe(expected);
    });

    it.each(CMD_QUOTED)('GIVEN the cmd shell WHEN %j is quoted THEN it is %j', (arg, expected) => {
      const quoted = quoteArg(arg, 'cmd');

      expect(quoted).toBe(expected);
    });

    describe.each<[ShellKind, string]>([
      ['posix', "'"],
      ['pwsh', "'"],
      ['cmd', '"']
    ])('GIVEN the %s shell', (kind, quote) => {
      it.each(LEADING_ARGS)('WHEN %j starts with = or @ THEN it is quoted', (arg) => {
        const quoted = quoteArg(arg, kind);

        expect(quoted).toBe(`${quote}${arg}${quote}`);
      });
    });
  });

  describe('copyText', () => {
    it.each<[ShellKind, string]>([
      ['posix', "turbo run build '--filter=@org/x y'"],
      ['pwsh', "turbo run build '--filter=@org/x y'"],
      ['cmd', 'turbo run build "--filter=@org/x y"']
    ])('GIVEN the %s shell WHEN a package name holds a space THEN the filter is quoted', (kind, expected) => {
      const text = copyText(TASK_NODE_STUB, '@org/x y', kind);

      expect(text).toBe(expected);
    });

    it('GIVEN a plain package WHEN copied THEN every argument stays bare', () => {
      const text = copyText(TASK_NODE_STUB, '@scope/pkg', 'posix');

      expect(text).toBe('turbo run build --filter=@scope/pkg');
    });

    it('GIVEN a task name with $ and ! for posix WHEN copied THEN the name is single quoted', () => {
      const task = { ...TASK_NODE_STUB, name: 'dep$loy!x' };

      const text = copyText(task, 'a', 'posix');

      expect(text).toBe("turbo run 'dep$loy!x' --filter=a");
    });

    it.each<[ShellKind, string]>([
      ['cmd', 'a%b'],
      ['cmd', 'a!b'],
      ['pwsh', 'a\\']
    ])('GIVEN the %s shell WHEN the task name is %j THEN nothing can be copied', (kind, name) => {
      const task = { ...TASK_NODE_STUB, name };

      const text = copyText(task, 'a', kind);

      expect(text).toBeNull();
    });

    it('GIVEN the package a* WHEN copied THEN it throws invalid-argument', () => {
      const copy = (): string | null => copyText(TASK_NODE_STUB, 'a*', 'posix');

      expect(copy).toThrow(TurboException);
      expect(copy).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
    });
  });
});
