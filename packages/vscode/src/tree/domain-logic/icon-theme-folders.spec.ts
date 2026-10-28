import { resolve } from 'node:path';

import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

import { IconThemeFolders } from './icon-theme-folders.ts';
import { ICON_THEME_BYTES_MAX } from '../common/icon-theme.const.ts';
import type { IconThemePorts, ThemeExtension } from '../common/icon-theme.type.ts';

const EXTENSION = '/ext/theme';
const THEME_FILE = resolve(EXTENSION, 'icons/theme.json');
const MINIMAL_JSON = '{"iconDefinitions":{},"folder":"_folder","file":"_file"}';
const SETI_JSON = '{"iconDefinitions":{},"file":"_file"}';
const COMMENTED_JSON = '// Minimal\n{"iconDefinitions":{},/* folders */"folder":"_folder",}';

type Fixture = {
  readonly ports: IconThemePorts;
  readonly read: Mock<IconThemePorts['read']>;
  readonly size: Mock<IconThemePorts['size']>;
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

const foldersOf = async (fixture: Fixture): Promise<boolean | null> => {
  const facts = await new IconThemeFolders(fixture.ports).facts();

  return facts.folders;
};

describe('FEATURE: icon theme folders', () => {
  describe('GIVEN an extension contributing the theme in use', () => {
    it.each([
      ['a folder key', true, MINIMAL_JSON],
      ['no folder key', false, SETI_JSON],
      ['comments and a trailing comma', true, COMMENTED_JSON],
      ['invalid JSON', null, '{'],
      ['a missing comma', null, '{"file":"_file" "folder":"_folder"}'],
      ['a JSON array', false, '[]'],
      ['a JSON null', false, 'null']
    ])('WHEN the theme file has %s THEN folders is %s', async (_name, expected, text) => {
      const fixture = fixtureOf();

      fixture.files.set(THEME_FILE, text);

      const folders = await foldersOf(fixture);

      expect(folders).toBe(expected);
    });

    it('WHEN the theme path leaves the extension folder THEN folders is null and nothing is read', async () => {
      const fixture = fixtureOf(themeEntryOf('../../etc/x.json'));

      fixture.files.set('/etc/x.json', MINIMAL_JSON);

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
      expect(fixture.size).not.toHaveBeenCalled();
      expect(fixture.read).not.toHaveBeenCalled();
    });

    it('WHEN the theme path is absolute THEN folders is null and nothing is read', async () => {
      const fixture = fixtureOf(themeEntryOf('/etc/x.json'));

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
      expect(fixture.read).not.toHaveBeenCalled();
    });

    it('WHEN the theme file is over 8 MB THEN folders is null and nothing is read', async () => {
      const fixture = fixtureOf();

      fixture.files.set(THEME_FILE, MINIMAL_JSON);
      fixture.size.mockResolvedValue(ICON_THEME_BYTES_MAX + 1);

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
      expect(fixture.read).not.toHaveBeenCalled();
    });

    it('WHEN the theme file is missing and read rejects THEN folders is null', async () => {
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
    ])('WHEN it is %s THEN folders is null', async (_name, packageJSON) => {
      const fixture = fixtureOf(packageJSON);

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
    });
  });

  describe('GIVEN no extension contributes the theme id, or there is no icon theme', () => {
    it.each([
      ['the theme id is unknown', 'theme-b'],
      ['no icon theme is set', null]
    ])('WHEN %s THEN folders is null', async (_name, themeId) => {
      const fixture = fixtureOf(MANIFEST, themeId);

      fixture.files.set(THEME_FILE, MINIMAL_JSON);

      const folders = await foldersOf(fixture);

      expect(folders).toBeNull();
    });
  });

  describe('GIVEN the answer is cached by theme id', () => {
    it('WHEN facts() runs twice for one theme THEN the file is read once', async () => {
      const fixture = fixtureOf();
      const folders = new IconThemeFolders(fixture.ports);

      fixture.files.set(THEME_FILE, MINIMAL_JSON);
      await folders.facts();

      await folders.facts();

      expect(fixture.read).toHaveBeenCalledTimes(1);
    });

    it('WHEN facts() runs again after clear() THEN the file is read again', async () => {
      const fixture = fixtureOf();
      const folders = new IconThemeFolders(fixture.ports);

      fixture.files.set(THEME_FILE, MINIMAL_JSON);
      await folders.facts();
      folders.clear();

      await folders.facts();

      expect(fixture.read).toHaveBeenCalledTimes(2);
    });

    it('WHEN the theme switches from one with no folders to one with THEN folders is false and then true', async () => {
      const files = new Map([
        [resolve('/seti', 's.json'), SETI_JSON],
        [resolve('/minimal', 'm.json'), MINIMAL_JSON]
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

      const seti = await folders.facts();

      themeId = 'vs-minimal';

      const minimal = await folders.facts();

      expect([seti.folders, minimal.folders]).toStrictEqual([false, true]);
    });

    it('WHEN facts() runs twice before the first read ends THEN the file is read once and both answers are one object', async () => {
      const fixture = fixtureOf();
      const folders = new IconThemeFolders(fixture.ports);

      fixture.files.set(THEME_FILE, MINIMAL_JSON);

      const [first, second] = await Promise.all([folders.facts(), folders.facts()]);

      expect(fixture.read).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
    });

    it('WHEN clear() runs mid-read and facts() runs again THEN the later answer is the new read, kept for later callers', async () => {
      const fixture = fixtureOf();
      let release: () => void = () => undefined;
      const held = new Promise<void>((done) => {
        release = done;
      });
      const texts = [SETI_JSON, MINIMAL_JSON];
      let reads = 0;
      const heldRead = vi.fn<IconThemePorts['read']>(async () => {
        const text = texts[reads] ?? '';

        reads += 1;
        await held;

        return Promise.resolve(new TextEncoder().encode(text));
      });
      const ports: IconThemePorts = { ...fixture.ports, size: async () => Promise.resolve(1), read: heldRead };
      const folders = new IconThemeFolders(ports);
      const stale = folders.facts();

      folders.clear();

      const fresh = folders.facts();

      release();

      const [staleFacts, freshFacts] = await Promise.all([stale, fresh]);
      const later = await folders.facts();

      expect(staleFacts.folders).toBe(false);
      expect(freshFacts.folders).toBe(true);
      expect(later).toBe(freshFacts);
      expect(heldRead).toHaveBeenCalledTimes(2);
    });

    it('WHEN clear() runs while a read is in flight THEN that read answer is not cached', async () => {
      const fixture = fixtureOf();
      let release: () => void = () => undefined;
      const held = new Promise<void>((done) => {
        release = done;
      });
      const heldRead: IconThemePorts['read'] = async (path) => {
        await held;

        return fixture.ports.read(path);
      };
      const folders = new IconThemeFolders({ ...fixture.ports, read: heldRead });

      fixture.files.set(THEME_FILE, SETI_JSON);

      const inFlight = folders.facts();

      folders.clear();
      release();
      await inFlight;
      fixture.files.set(THEME_FILE, MINIMAL_JSON);

      const after = await folders.facts();

      expect(after.folders).toBe(true);
    });
  });
});
