import { describe, expect, it } from 'vitest';

import { assertTurboName } from './turbo-name.util.ts';

const REJECTED: [string, string][] = [
  ['', 'empty'],
  ['-x', 'starts with -'],
  ['--filter', 'starts with -'],
  ['a\u0000b', 'contains a control character'],
  ['a\tb', 'contains a control character'],
  ['a\nb', 'contains a control character'],
  ['a\u001Fb', 'contains a control character'],
  ['a\u007Fb', 'contains a control character']
];

describe('FEATURE: turbo name check', () => {
  describe('GIVEN a name turbo could misread', () => {
    it.each(REJECTED)('WHEN %j is checked THEN it throws invalid-argument: %s', (name, reason) => {
      const expected = { kind: 'invalid-argument', message: `invalid turbo name ${JSON.stringify(name)}: ${reason}` };

      expect(() => assertTurboName(name)).toThrow(expect.objectContaining(expected));
    });

    it('WHEN a 5000-character name is rejected THEN the message echoes only its first 200 characters', () => {
      const name = `-${'x'.repeat(4999)}`;
      const expected = { message: `invalid turbo name "-${'x'.repeat(199)}": starts with -` };

      expect(() => assertTurboName(name)).toThrow(expect.objectContaining(expected));
    });
  });

  describe('GIVEN a workspace-derived name turbo reads as a name', () => {
    it.each(['my task', ' x', 'build[1]', 'täsk-ü', '@scope/pkg#e2e--tests/a b.spec.ts', 'a-'])('WHEN %j is checked THEN it does not throw', (name) => {
      expect(() => assertTurboName(name)).not.toThrow();
    });
  });
});
