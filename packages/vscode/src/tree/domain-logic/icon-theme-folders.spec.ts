import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { IconThemeFolders } from './icon-theme-folders.ts';
import { ICON_THEME_BYTES_MAX } from '../common/icon-theme.const.ts';
import type { IconThemePorts, ThemeExtension } from '../common/icon-theme.type.ts';

const EXTENSION = '/ext/theme';
const THEME_FILE = join(EXTENSION, 'icons/theme.json');
const MINIMAL_JSON = '{"iconDefinitions":{},"folder":"_folder","file":"_file"}';
const SETI_JSON = '{"iconDefinitions":{},"file":"_file"}';

type Fixture = {
  readonly ports: IconThemePorts;
  readonly read: ReturnType<typeof vi.fn<IconThemePorts['read']>>;
  readonly size: ReturnType<typeof vi.fn<IconThemePorts['size']>>;
  readonly files: Map<string, string>;
};

const manifestOf = (entry: unknown): unknown => {
  const contributes = { iconThemes: [entry] };
  const manifest = { contributes };

  return manifest;
};

const extensionOf = (packageJSON: unknown): ThemeExtension[] => {
  const extension: ThemeExtension = { extensionPath: EXTENSION, packageJSON };

  return [extension];
};

const themeEntryOf = (path: string): unknown => manifestOf({ id: 'theme-a', path });

const MANIFEST = themeEntryOf('./icons/theme.json');

const fixtureOf = (packageJSON: unknown = MANIFEST, themeId: string | null = 'theme-a'): Fixture => {
  const files = new Map<string, string>();
  const size = vi.fn<IconThemePorts['size']>(async (path) => Promise.resolve(files.get(path)?.length ?? 0));
  const read = vi.fn<IconThemePorts['read']>(async (path) => {
    const text = files.get(path);

    if (text === undefined) return Promise.reject(new Error(`ENOENT ${path}`));

    return Promise.resolve(new TextEncoder().encode(text));
  });
  const ports: IconThemePorts = { themeId: () => themeId, extensions: () => extensionOf(packageJSON), size, read };
  const fixture: Fixture = { files, size, read, ports };

  return fixture;
};

const foldersOf = async (fixture: Fixture): Promise<boolean | null> => new IconThemeFolders(fixture.ports).has();

describe('FEATURE: icon theme folders', () => {
  describe('GIVEN an extension contributing the theme in use', () => {
    it.each([
      ['a folder key', MINIMAL_JSON, true],
      ['no folder key', SETI_JSON, false],
      ['invalid JSON', '{', null],
      ['a JSON array', '[]', false],
      ['a JSON null', 'null', false]
    ])('WHEN the theme file has %s THEN has() is %s', async (_name, text, expected) => {
      const fixture = fixtureOf();

      fixture.files.set(THEME_FILE, text);

      const folders = await foldersOf(fixture);

      expect(folders).toBe(expected);
    });

    it('WHEN the theme path leaves the extension folder THEN has() is null and nothing is read', async () => {
      const fixture = fixtureOf(themeEntryOf('../../etc/x.json'));

      fixture.files.set('/etc/x.json', MINIMAL_JSON);

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
      expect(fixture.size).not.toHaveBeenCalled();
      expect(fixture.read).not.toHaveBeenCalled();
    });

    it('WHEN the theme path is absolute THEN has() is null and nothing is read', async () => {
      const fixture = fixtureOf(themeEntryOf('/etc/x.json'));

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
      expect(fixture.read).not.toHaveBeenCalled();
    });

    it('WHEN the theme file is over 8 MB THEN has() is null and nothing is read', async () => {
      const fixture = fixtureOf();

      fixture.files.set(THEME_FILE, MINIMAL_JSON);
      fixture.size.mockResolvedValue(ICON_THEME_BYTES_MAX + 1);

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
      expect(fixture.read).not.toHaveBeenCalled();
    });

    it('WHEN the theme file is missing and read rejects THEN has() is null', async () => {
      const fixture = fixtureOf();

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
    });
  });

  describe('GIVEN a package.json that is not the shape of an icon theme contribution', () => {
    it.each([
      ['a string', 'x'],
      ['no contributes', {}],
      ['contributes of null', { contributes: null }],
      ['iconThemes of an object', { contributes: {} }],
      ['an entry of null', manifestOf(null)],
      ['an entry without a path', manifestOf({ id: 'theme-a' })],
      ['an entry whose path is a number', manifestOf({ id: 'theme-a', path: 7 })]
    ])('WHEN it is %s THEN has() is null', async (_name, packageJSON) => {
      const fixture = fixtureOf(packageJSON);

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
    });
  });

  describe('GIVEN no extension contributes the theme id, or there is no icon theme', () => {
    it.each([
      ['the theme id is unknown', 'theme-b'],
      ['no icon theme is set', null]
    ])('WHEN %s THEN has() is null', async (_name, themeId) => {
      const fixture = fixtureOf(MANIFEST, themeId);

      fixture.files.set(THEME_FILE, MINIMAL_JSON);

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
    });
  });

  describe('GIVEN the answer is cached by theme id', () => {
    it('WHEN has() runs twice for one theme THEN the file is read once, and again after clear()', async () => {
      const fixture = fixtureOf();
      const folders = new IconThemeFolders(fixture.ports);

      fixture.files.set(THEME_FILE, MINIMAL_JSON);
      await folders.has();
      await folders.has();

      expect(fixture.read).toHaveBeenCalledTimes(1);

      folders.clear();
      await folders.has();

      expect(fixture.read).toHaveBeenCalledTimes(2);
    });

    it('WHEN the theme switches from one with no folders to one with THEN has() is false and then true', async () => {
      const files = new Map([
        ['/seti/s.json', SETI_JSON],
        ['/minimal/m.json', MINIMAL_JSON]
      ]);
      const manifestFor = (id: string, path: string): unknown => manifestOf({ id, path });
      const extensions: ThemeExtension[] = [
        { extensionPath: '/seti', packageJSON: manifestFor('vs-seti', 's.json') },
        { extensionPath: '/minimal', packageJSON: manifestFor('vs-minimal', 'm.json') }
      ];
      let themeId = 'vs-seti';
      const ports: IconThemePorts = {
        themeId: () => themeId,
        extensions: () => extensions,
        size: async () => Promise.resolve(1),
        read: async (path) => Promise.resolve(new TextEncoder().encode(files.get(path) ?? ''))
      };
      const folders = new IconThemeFolders(ports);

      const seti = await folders.has();

      themeId = 'vs-minimal';

      const minimal = await folders.has();

      expect([seti, minimal]).toStrictEqual([false, true]);
    });

    it('WHEN clear() runs while a read is in flight THEN that read answer is not cached', async () => {
      const fixture = fixtureOf();
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const heldRead: IconThemePorts['read'] = async (path) => {
        await held;

        return fixture.ports.read(path);
      };
      const folders = new IconThemeFolders({ ...fixture.ports, read: heldRead });

      fixture.files.set(THEME_FILE, SETI_JSON);

      const inFlight = folders.has();

      folders.clear();
      release();
      await inFlight;
      fixture.files.set(THEME_FILE, MINIMAL_JSON);

      const after = await folders.has();

      expect(after).toBe(true);
    });
  });
});
