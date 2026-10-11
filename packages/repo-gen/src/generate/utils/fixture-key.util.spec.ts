import { describe, expect, it } from 'vitest';

import { fixtureKey } from './fixture-key.util.ts';
import type { FixtureFile } from '../common/fixture.type.ts';

const ROOT_FILE: FixtureFile = { path: 'package.json', content: '{}\n' };
const HUB_FILE: FixtureFile = { path: 'packages/hub/src/index.ts', content: 'export const hub = 1;\n' };

describe('FEATURE: fixture cache key', () => {
  describe('GIVEN a rendered file list', () => {
    const key = fixtureKey([ROOT_FILE, HUB_FILE]);

    it('WHEN keyed THEN the key is a sha256 hex digest', () => {
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('WHEN an equal list is keyed THEN the key is the same', () => {
      const copy = structuredClone([ROOT_FILE, HUB_FILE]);

      const copyKey = fixtureKey(copy);

      expect(copyKey).toBe(key);
    });

    it('WHEN one byte of one content changes THEN the key changes', () => {
      const editedHub: FixtureFile = { ...HUB_FILE, content: 'export const hub = 2;\n' };

      const editedKey = fixtureKey([ROOT_FILE, editedHub]);

      expect(editedKey).not.toBe(key);
    });

    it('WHEN a path changes THEN the key changes', () => {
      const movedRoot: FixtureFile = { ...ROOT_FILE, path: 'package.jsonx' };

      const movedKey = fixtureKey([movedRoot, HUB_FILE]);

      expect(movedKey).not.toBe(key);
    });

    it('WHEN bytes move from one content into the next path THEN the key changes', () => {
      const shortRoot: FixtureFile = { ...ROOT_FILE, content: '{}' };
      const longHub: FixtureFile = { ...HUB_FILE, path: `\n${HUB_FILE.path}` };

      const shiftedKey = fixtureKey([shortRoot, longHub]);

      expect(shiftedKey).not.toBe(key);
    });
  });
});
