import { describe, expect, it } from 'vitest';

import { jsonPropertyAt } from './json-property.util.ts';

const MANIFEST_LINES = ['{', '  "name": "a",', '  "scripts": {', '    "build": "tsc",', '    "test": "vitest"', '  }', '}'];

const MANIFEST = MANIFEST_LINES.join('\n');

/** The text of the property at `path`, key to end of value; `null` for none. */
const propertyTextAt = (text: string, path: string[]): string | null => {
  const property = jsonPropertyAt(text, path);

  if (property === null) return null;

  return text.slice(property.offset, property.offset + property.length);
};

describe('FEATURE: jsonPropertyAt', () => {
  describe('GIVEN a package.json with a scripts entry', () => {
    it('WHEN the script is looked up THEN the property spans its key to the end of its value', () => {
      const text = propertyTextAt(MANIFEST, ['scripts', 'build']);

      expect(text).toBe('"build": "tsc"');
    });

    it('WHEN the scripts object is looked up THEN its key is the first child of the property', () => {
      const property = jsonPropertyAt(MANIFEST, ['scripts']);
      const children = [{ value: 'scripts' }, { type: 'object' }];
      const shape = { children };

      expect(property).toMatchObject(shape);
    });

    it('WHEN a key that also sits outside scripts is looked up THEN the scripts one is found', () => {
      const text = '{ "dependencies": { "build": "1.0.0" }, "scripts": { "build": "tsc" } }';

      const found = propertyTextAt(text, ['scripts', 'build']);

      expect(found).toBe('"build": "tsc"');
    });

    it('WHEN a name with quotes, dots and colons is looked up THEN its entry is found', () => {
      const text = '{ "scripts": { "a.b": "x", "build:\\"q\\"": "y" } }';

      const found = propertyTextAt(text, ['scripts', 'build:"q"']);

      expect(found).toBe('"build:\\"q\\"": "y"');
    });
  });

  describe('GIVEN a lookup that finds no property', () => {
    it.each<[string, string, string[]]>([
      ['an absent script', MANIFEST, ['scripts', 'lint']],
      ['no scripts object', '{ "name": "a" }', ['scripts', 'build']],
      ['a scripts value that is not an object', '{ "scripts": "build" }', ['scripts', 'build']],
      ['an empty text', '', ['scripts']],
      ['a root that is an array', '[1, 2]', ['scripts']]
    ])('WHEN the text has %s THEN it is null', (_name, text, path) => {
      const property = jsonPropertyAt(text, path);

      expect(property).toBeNull();
    });
  });

  describe('GIVEN invalid JSON', () => {
    it('WHEN the script before the error is looked up THEN it is still found', () => {
      const text = '{ "scripts": { "build": "tsc", "test": } }';

      const found = propertyTextAt(text, ['scripts', 'build']);

      expect(found).toBe('"build": "tsc"');
    });

    it('WHEN the text is nested deep enough to overflow the parser stack THEN it is null, not a throw', () => {
      const text = '['.repeat(200_000);

      const property = jsonPropertyAt(text, ['scripts']);

      expect(property).toBeNull();
    });
  });
});
