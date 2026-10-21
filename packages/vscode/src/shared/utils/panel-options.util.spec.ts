import { describe, expect, it } from 'vitest';

import { panelOptionsOf } from './panel-options.util.ts';

describe('FEATURE: webview panel options', () => {
  describe('GIVEN the page folder', () => {
    it('WHEN options are built THEN scripts are on and only that folder is a resource root', () => {
      const options = panelOptionsOf('page-folder');

      expect(options).toStrictEqual({
        enableScripts: true,
        enableForms: false,
        localResourceRoots: ['page-folder'],
        retainContextWhenHidden: false
      });
    });

    it('WHEN options are built THEN command uris stay unset', () => {
      const options = panelOptionsOf('page-folder');

      expect(options).not.toHaveProperty('enableCommandUris');
    });
  });
});
