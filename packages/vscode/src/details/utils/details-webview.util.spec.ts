import { webviewCsp } from '@turbo-console/webview-ui';
import { describe, expect, it, vi } from 'vitest';

import { detailsHtml, panelOptionsOf } from './details-webview.util.ts';
import type { HtmlAssets } from '../common/details-webview.type.ts';

const TEMPLATE_LINES = [
  '<meta http-equiv="Content-Security-Policy" content="{{csp}}" />',
  '<link rel="stylesheet" href="{{codiconUri}}" />',
  '<link rel="stylesheet" href="{{styleUri}}" />',
  '<script nonce="{{nonce}}" src="{{scriptUri}}"></script>'
];
const TEMPLATE = TEMPLATE_LINES.join('\n');

const CSP_SOURCE = 'https://webview.test';

const assetsMock = (): HtmlAssets => {
  const assets: HtmlAssets = { cspSource: CSP_SOURCE, uriOf: vi.fn((name: string) => `https://webview.test/details/${name}`) };

  return assets;
};

describe('FEATURE: the details page html and panel options', () => {
  describe('GIVEN the page template', () => {
    it('WHEN it is rendered THEN the nonce goes into the csp and the script tag and the csp names the webview source', () => {
      const html = detailsHtml(TEMPLATE, assetsMock(), 'N0nce+/==');

      expect(html).toContain(`content="${webviewCsp('N0nce+/==', CSP_SOURCE)}"`);
      expect(html).toContain('<script nonce="N0nce+/==" src=');
    });

    it('WHEN it is rendered THEN every uri slot is the webview uri of one fixed file name and nothing else', () => {
      const assets = assetsMock();

      const html = detailsHtml(TEMPLATE, assets, 'n');

      expect(html).toContain('href="https://webview.test/details/codicon.css"');
      expect(html).toContain('href="https://webview.test/details/details.css"');
      expect(html).toContain('src="https://webview.test/details/main.js"');
      expect(assets.uriOf).toHaveBeenCalledTimes(3);
    });

    it('WHEN a uri holds a quote THEN rendering throws instead of closing the attribute', () => {
      const hostile: HtmlAssets = { cspSource: CSP_SOURCE, uriOf: () => 'x" onload="alert(1)' };

      expect(() => detailsHtml(TEMPLATE, hostile, 'n')).toThrow('unsafe webview slot value');
    });

    it('WHEN the template has a slot the page does not fill THEN rendering throws', () => {
      expect(() => detailsHtml('{{other}}', assetsMock(), 'n')).toThrow('unfilled webview slot');
    });
  });

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
