import { MANIFEST_ENTRIES_MAX } from '@turbo-console/webview-ui';
import { describe, expect, it } from 'vitest';

import { aliasKeysOf } from './manifest-entries.util.ts';

const DEPENDENCY = '@company/ui';
const ALIAS_SPEC = `npm:${DEPENDENCY}@^1`;
const BIDI_KEY = `ui${String.fromCodePoint(0x202e)}alias`;
const LONG_KEY = 'k'.repeat(300);

/** A `package.json` text holding `entries` under `field`. */
const manifestOf = (field: string, entries: Record<string, unknown>): string => {
  const manifest = { [field]: entries };

  return JSON.stringify(manifest);
};

/** `count` distinct alias keys of `DEPENDENCY`, as a `dependencies` entry record. */
const aliasEntriesOf = (count: number): Record<string, string> => {
  const keys = Array.from({ length: count }, (_, index) => `alias-${index}`);
  const entries = Object.fromEntries(keys.map((key) => [key, ALIAS_SPEC]));

  return entries;
};

describe('FEATURE: alias keys of a dependency', () => {
  describe('GIVEN a package.json text', () => {
    it.each([
      ['an npm alias', ['ui-alias'], '{"dependencies":{"ui-alias":"npm:@company/ui@^1"}}'],
      ['a workspace alias with a range', ['ui-alias'], '{"dependencies":{"ui-alias":"workspace:@company/ui@*"}}'],
      ["B's own key with an npm value", [], '{"dependencies":{"@company/ui":"npm:@company/ui@1"}}'],
      ['a plain range under B', [], '{"dependencies":{"@company/ui":"^1"}}'],
      ['an alias of another package', [], '{"dependencies":{"kit":"npm:@company/ui-kit@1"}}'],
      ['a number value', [], '{"dependencies":{"ui-alias":1}}'],
      ['a JSON array', [], '[]'],
      ['text that is not JSON', [], 'x']
    ])('WHEN it is %s THEN the alias keys are %j', (_title, expected, text) => {
      const keys = aliasKeysOf(text, DEPENDENCY);

      expect(keys).toStrictEqual(expected);
    });

    it('WHEN one alias key is in devDependencies and another in dependencies THEN dependencies come first', () => {
      const text = '{"devDependencies":{"dev-alias":"npm:@company/ui@1"},"dependencies":{"dep-alias":"npm:@company/ui@1"}}';

      const keys = aliasKeysOf(text, DEPENDENCY);

      expect(keys).toStrictEqual(['dep-alias', 'dev-alias']);
    });

    it('WHEN the same alias key is in dependencies and peerDependencies THEN it is listed once', () => {
      const text = '{"dependencies":{"ui-alias":"npm:@company/ui@1"},"peerDependencies":{"ui-alias":"npm:@company/ui@1"}}';

      const keys = aliasKeysOf(text, DEPENDENCY);

      expect(keys).toStrictEqual(['ui-alias']);
    });

    it('WHEN an alias key is 300 chars THEN it comes back whole', () => {
      const text = manifestOf('dependencies', { [LONG_KEY]: ALIAS_SPEC });

      const keys = aliasKeysOf(text, DEPENDENCY);

      expect(keys).toStrictEqual([LONG_KEY]);
    });

    it('WHEN an alias key holds U+202E THEN it comes back raw', () => {
      const text = manifestOf('dependencies', { [BIDI_KEY]: ALIAS_SPEC });

      const keys = aliasKeysOf(text, DEPENDENCY);

      expect(keys).toStrictEqual([BIDI_KEY]);
    });

    it('WHEN there is one more alias key than the cap THEN only the keys up to the cap are listed', () => {
      const text = manifestOf('dependencies', aliasEntriesOf(MANIFEST_ENTRIES_MAX + 1));
      const expected = Object.keys(aliasEntriesOf(MANIFEST_ENTRIES_MAX));

      const keys = aliasKeysOf(text, DEPENDENCY);

      expect(keys).toStrictEqual(expected);
    });
  });
});
