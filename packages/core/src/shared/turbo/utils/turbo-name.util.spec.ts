import { describe, expect, it } from 'vitest';

import { assertFilterName, assertTaskName, assertTurboName } from './turbo-name.util.ts';

/** Name, the echo in the message (JSON-quoted, then any character a plain line drops written as `\u{hex}`), reason. */
const REJECTED: [string, string, string][] = [
  ['', '""', 'empty'],
  ['-x', '"-x"', 'starts with -'],
  ['--filter', '"--filter"', 'starts with -'],
  ['a\u0000b', '"a\\u0000b"', 'contains a control character'],
  ['a\tb', '"a\\tb"', 'contains a control character'],
  ['a\nb', '"a\\nb"', 'contains a control character'],
  ['a\u001Fb', '"a\\u001fb"', 'contains a control character'],
  ['a\u007Fb', '"a\\u{7f}b"', 'contains a control character']
];

/** Filter syntax in the same shape; the last three prove the base name check runs first. */
const FILTER_REJECTED: [string, string, string][] = [
  ['!x', '"!x"', 'starts with !'],
  ['^x', '"^x"', 'starts with ^'],
  ['./x', '"./x"', 'starts with .'],
  ['../x', '"../x"', 'starts with .'],
  ['.x', '".x"', 'starts with .'],
  ['x...', '"x..."', 'contains ...'],
  ['...x', '"...x"', 'starts with .'],
  ['{x}', '"{x}"', 'contains {'],
  ['x}', '"x}"', 'contains }'],
  ['[x]', '"[x]"', 'contains ['],
  ['x]', '"x]"', 'contains ]'],
  ['a*', '"a*"', 'contains *'],
  ['', '""', 'empty'],
  ['-x', '"-x"', 'starts with -'],
  ['a\nb', '"a\\nb"', 'contains a control character']
];

describe('FEATURE: turbo name check', () => {
  describe('GIVEN a name turbo could misread', () => {
    it.each(REJECTED)('WHEN %j is checked THEN it throws invalid-argument echoing %s: %s', (name, echoed, reason) => {
      const expected = { kind: 'invalid-argument', message: `invalid turbo name ${echoed}: ${reason}` };

      expect(() => assertTurboName(name)).toThrow(expect.objectContaining(expected));
    });

    it('WHEN a 5000-character name is rejected THEN the message echoes only its first 200 characters', () => {
      const name = `-${'x'.repeat(4999)}`;
      const expected = { message: `invalid turbo name "-${'x'.repeat(199)}": starts with -` };

      expect(() => assertTurboName(name)).toThrow(expect.objectContaining(expected));
    });

    it.each([
      ['-\u202Ex', '"-\\u{202e}x"'],
      ['-\u009B31m', '"-\\u{9b}31m"'],
      ['-\u{E0041}x', '"-\\u{e0041}x"']
    ])(
      'WHEN %j, holding a bidi override, a C1 CSI sequence or a tag character, is rejected THEN the message echoes %s',
      (name, echoed) => {
        const expected = { message: `invalid turbo name ${echoed}: starts with -` };

        expect(() => assertTurboName(name)).toThrow(expect.objectContaining(expected));
      }
    );
  });

  describe('GIVEN a workspace-derived name turbo reads as a name', () => {
    it.each(['my task', ' x', 'build[1]', 'täsk-ü', '@scope/pkg#e2e--tests/a b.spec.ts', 'a-'])(
      'WHEN %j is checked THEN it does not throw',
      (name) => {
        expect(() => assertTurboName(name)).not.toThrow();
      }
    );
  });

  describe('GIVEN a package name turbo could read as filter syntax', () => {
    it.each(FILTER_REJECTED)(
      'WHEN %j is checked as a filter THEN it throws invalid-argument echoing %s: %s',
      (name, echoed, reason) => {
        const expected = { kind: 'invalid-argument', message: `invalid turbo name ${echoed}: ${reason}` };

        expect(() => assertFilterName(name)).toThrow(expect.objectContaining(expected));
      }
    );
  });

  describe('GIVEN a package name turbo reads as a plain name', () => {
    it.each(['@scope/pkg', 'pkg-001', 'a.b', 'a^b'])('WHEN %j is checked as a filter THEN it does not throw', (name) => {
      expect(() => assertFilterName(name)).not.toThrow();
    });
  });

  describe('GIVEN a task name', () => {
    it('WHEN it holds a # THEN it throws invalid-argument naming the #', () => {
      const expected = { kind: 'invalid-argument', message: 'invalid turbo name "b#build": contains #' };

      expect(() => assertTaskName('b#build')).toThrow(expect.objectContaining(expected));
    });

    it.each(['', '-x'])('WHEN %j is checked as a task name THEN the base check rejects it first', (name) => {
      expect(() => assertTaskName(name)).toThrow(expect.objectContaining({ kind: 'invalid-argument' }));
    });

    it('WHEN it holds spaces and brackets THEN it does not throw', () => {
      expect(() => assertTaskName('my task[1]')).not.toThrow();
    });
  });
});
