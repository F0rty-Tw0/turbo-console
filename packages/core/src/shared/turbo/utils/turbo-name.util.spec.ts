import { describe, expect, it } from 'vitest';

import { assertTurboName } from './turbo-name.util.ts';

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
    ])('WHEN %j, holding a bidi override, a C1 CSI sequence or a tag character, is rejected THEN the message echoes %s', (name, echoed) => {
      const expected = { message: `invalid turbo name ${echoed}: starts with -` };

      expect(() => assertTurboName(name)).toThrow(expect.objectContaining(expected));
    });
  });

  describe('GIVEN a workspace-derived name turbo reads as a name', () => {
    it.each(['my task', ' x', 'build[1]', 'täsk-ü', '@scope/pkg#e2e--tests/a b.spec.ts', 'a-'])('WHEN %j is checked THEN it does not throw', (name) => {
      expect(() => assertTurboName(name)).not.toThrow();
    });
  });
});
