import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { IconThemeFolders } from './icon-theme-folders.ts';
import { NO_FILE_NAMES, UNKNOWN_FACTS } from '../common/icon-theme.const.ts';
import type { IconThemePorts, ThemeExtension } from '../common/icon-theme.type.ts';

const EXTENSION = '/ext/theme';
const THEME_FILE = resolve(EXTENSION, 'theme.json');

const portsOf = (text: string | null, themeId: string | null = 'theme-a'): IconThemePorts => {
  const entry = { id: 'theme-a', path: './theme.json' };
  const contributes = { iconThemes: [entry] };
  const packageJSON = { contributes };
  const extension: ThemeExtension = { extensionPath: EXTENSION, packageJSON };
  const read = async (path: string): Promise<Uint8Array> => {
    if (text === null || path !== THEME_FILE) return Promise.reject(new Error(`ENOENT ${path}`));

    return Promise.resolve(new TextEncoder().encode(text));
  };
  const size = async (): Promise<number> => Promise.resolve(text?.length ?? 0);
  const ports: IconThemePorts = { themeId: () => themeId, extensions: () => [extension], size, read };

  return ports;
};

describe('FEATURE: icon theme file names', () => {
  describe('GIVEN a theme file with top-level fileNames', () => {
    it('WHEN keys are mixed case THEN fileNames holds them lowercased', async () => {
      const text = '{"fileNames":{"Vitest.Config.TS":"_v","angular.json":"_a"}}';
      const probe = new IconThemeFolders(portsOf(text));

      const facts = await probe.facts();

      expect([...facts.fileNames]).toStrictEqual(['vitest.config.ts', 'angular.json']);
    });

    it('WHEN the theme also has a folder key THEN folders is true and fileNames still read', async () => {
      const text = '{"folder":"_f","fileNames":{"angular.json":"_a"}}';
      const probe = new IconThemeFolders(portsOf(text));

      const facts = await probe.facts();

      expect(facts.folders).toBe(true);
      expect(facts.fileNames.has('angular.json')).toBe(true);
    });
  });

  describe('GIVEN a theme file without usable top-level fileNames', () => {
    it.each([
      ['no fileNames key', '{"folder":"_f"}'],
      ['fileNames an array', '{"fileNames":["a.json"]}'],
      ['fileNames a string', '{"fileNames":"a.json"}'],
      ['fileNames null', '{"fileNames":null}'],
      ['fileNames only under light', '{"light":{"fileNames":{"a.json":"_a"}}}'],
      ['fileNames only under highContrast', '{"highContrast":{"fileNames":{"a.json":"_a"}}}']
    ])('WHEN the theme has %s THEN fileNames is the shared empty set', async (_name, text) => {
      const probe = new IconThemeFolders(portsOf(text));

      const facts = await probe.facts();

      expect(facts.fileNames).toBe(NO_FILE_NAMES);
    });
  });

  describe('GIVEN a theme that cannot be read', () => {
    it.each([
      ['a parse error', '{'],
      ['a missing theme file', null]
    ])('WHEN the cause is %s THEN the facts are the unknown facts', async (_name, text) => {
      const probe = new IconThemeFolders(portsOf(text));

      const facts = await probe.facts();

      expect(facts).toBe(UNKNOWN_FACTS);
    });

    it('WHEN there is no theme id THEN the facts are the unknown facts', async () => {
      const probe = new IconThemeFolders(portsOf('{"fileNames":{"a.json":"_a"}}', null));

      const facts = await probe.facts();

      expect(facts).toBe(UNKNOWN_FACTS);
    });
  });

  describe('GIVEN the facts are cached by theme id', () => {
    it('WHEN facts() runs twice for one theme THEN it is the same object', async () => {
      const probe = new IconThemeFolders(portsOf('{"fileNames":{"a.json":"_a"}}'));
      const first = await probe.facts();

      const second = await probe.facts();

      expect(second).toBe(first);
    });

    it('WHEN facts() runs again after clear() THEN it is a new object', async () => {
      const probe = new IconThemeFolders(portsOf('{"fileNames":{"a.json":"_a"}}'));
      const first = await probe.facts();

      probe.clear();

      const second = await probe.facts();

      expect(second).not.toBe(first);
      expect(second.fileNames).not.toBe(first.fileNames);
    });
  });
});
