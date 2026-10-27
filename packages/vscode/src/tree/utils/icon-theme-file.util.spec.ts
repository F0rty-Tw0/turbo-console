import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { hasFolderKey, themeFileOf } from './icon-theme-file.util.ts';
import type { ThemeExtension } from '../common/icon-theme.type.ts';

const EXTENSION = '/ext/theme';

const manifestOf = (id: string, path: string): unknown => {
  const entry = { id, path };
  const contributes = { iconThemes: [entry] };
  const manifest = { contributes };

  return manifest;
};

const extensionOf = (path: string, extensionPath = EXTENSION): ThemeExtension => {
  const packageJSON = manifestOf('theme-a', path);
  const extension: ThemeExtension = { extensionPath, packageJSON };

  return extension;
};

describe('FEATURE: icon theme file', () => {
  describe('GIVEN one extension contributing theme-a', () => {
    it.each([
      ['a file inside the extension folder', resolve(EXTENSION, 'icons/theme.json'), './icons/theme.json'],
      ['a folder named ..x inside the extension folder', resolve(EXTENSION, '..x/theme.json'), '..x/theme.json'],
      ['a path leaving the extension folder', null, '../other/theme.json'],
      ['the parent of the extension folder', null, '..'],
      ['an absolute path', null, '/etc/theme.json']
    ])('WHEN its path is %s THEN themeFileOf is %s', (_name, expected, path) => {
      const extensions = [extensionOf(path)];

      const file = themeFileOf(extensions, 'theme-a');

      expect(file).toBe(expected);
    });

    it('WHEN another theme id is asked for THEN themeFileOf is null', () => {
      const extensions = [extensionOf('./icons/theme.json')];

      const file = themeFileOf(extensions, 'theme-b');

      expect(file).toBeNull();
    });
  });

  it('GIVEN theme-a in the second extension WHEN it is looked up THEN themeFileOf is the file in that extension', () => {
    const first: ThemeExtension = { extensionPath: '/ext/other', packageJSON: manifestOf('theme-z', 'z.json') };
    const extensions = [first, extensionOf('a.json', '/ext/second')];

    const file = themeFileOf(extensions, 'theme-a');

    expect(file).toBe(resolve('/ext/second', 'a.json'));
  });

  describe('GIVEN a parsed theme file', () => {
    it.each([
      ['an object with a folder key', true, { folder: '_folder' }],
      ['an object without one', false, { file: '_file' }],
      ['an array', false, ['folder']],
      ['null', false, null],
      ['a string', false, 'folder']
    ])('WHEN it is %s THEN hasFolderKey is %s', (_name, expected, parsed) => {
      const hasFolder = hasFolderKey(parsed);

      expect(hasFolder).toBe(expected);
    });
  });
});
