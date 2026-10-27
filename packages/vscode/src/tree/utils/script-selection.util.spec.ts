import { describe, expect, it } from 'vitest';

import { scriptSelectionOf } from './script-selection.util.ts';
import { selectionOnLine } from '../test/utils/text-selection.spec.util.ts';

const MANIFEST_LINES = [
  '{',
  '  "name": "a",',
  '  "dependencies": { "build": "1.0.0" },',
  '  "scripts": {',
  '    "build": "tsc",',
  '    "test": "vitest"',
  '  }',
  '}'
];

const MANIFEST = MANIFEST_LINES.join('\n');

describe('FEATURE: scriptSelectionOf', () => {
  describe('GIVEN a package.json with scripts build and test', () => {
    it('WHEN build is looked up THEN the selection is its property on its own line, not the dependency named build', () => {
      const selection = scriptSelectionOf(MANIFEST, 'build');

      const expected = selectionOnLine(4, 4, 18);

      expect(selection).toStrictEqual(expected);
    });

    it('WHEN the file uses CR LF breaks THEN the selection is on the same line', () => {
      const crlf = MANIFEST.replaceAll('\n', '\r\n');

      const selection = scriptSelectionOf(crlf, 'test');

      const expected = selectionOnLine(5, 4, 20);

      expect(selection).toStrictEqual(expected);
    });

    it.each<[string, string, string]>([
      ['a script it does not hold', MANIFEST, 'lint'],
      ['no scripts object', '{ "name": "a" }', 'build'],
      ['invalid JSON that loses the entry', '{ "scripts": ', 'build'],
      ['a name only a dependency holds', '{ "dependencies": { "x": "1" }, "scripts": {} }', 'x']
    ])('WHEN the text has %s THEN there is no selection', (_name, text, name) => {
      const selection = scriptSelectionOf(text, name);

      expect(selection).toBeNull();
    });
  });
});
