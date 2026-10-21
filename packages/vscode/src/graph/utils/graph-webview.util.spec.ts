import { graphCsp } from '@turbo-console/webview-ui';
import { describe, expect, it, vi } from 'vitest';

import { graphHtml, graphTitleOf } from './graph-webview.util.ts';
import type { HtmlAssets } from '../../shared/common/html-assets.type.ts';

const CSP_SOURCE = 'https://webview.test';
const FIXTURE_TEMPLATE = '{{csp}}|{{nonce}}|{{scriptUri}}|{{styleUri}}';
const SLICE_ONE_TEMPLATE = '{{csp}}|{{nonce}}|{{scriptUri}}';

const assetsOf = (uriOf: HtmlAssets['uriOf']): HtmlAssets => {
  const assets: HtmlAssets = { cspSource: CSP_SOURCE, uriOf };

  return assets;
};

describe('FEATURE: the graph page html', () => {
  describe('GIVEN the template with all four slots', () => {
    it('WHEN it is rendered THEN the csp is the graph csp and the nonce and two file URIs fill their slots', () => {
      const uriOf = vi.fn((name: string) => `https://webview.test/graph/${name}`);

      const html = graphHtml(FIXTURE_TEMPLATE, assetsOf(uriOf), 'N0nce');

      const csp = graphCsp('N0nce', CSP_SOURCE);

      expect(html).toBe(`${csp}|N0nce|https://webview.test/graph/main.js|https://webview.test/graph/graph.css`);
      expect(uriOf.mock.calls).toStrictEqual([['main.js'], ['graph.css']]);
    });
  });

  describe('GIVEN a template without the style slot', () => {
    it('WHEN it is rendered THEN the three slots it has are filled and the style uri is left out', () => {
      const uriOf = (name: string): string => `https://webview.test/graph/${name}`;

      const html = graphHtml(SLICE_ONE_TEMPLATE, assetsOf(uriOf), 'n');

      expect(html).toBe(`${graphCsp('n', CSP_SOURCE)}|n|https://webview.test/graph/main.js`);
    });
  });

  describe('GIVEN a uri that would close the attribute', () => {
    it('WHEN the page renders THEN it throws unsafe webview slot value', () => {
      const assets = assetsOf(() => 'x" onload="a');
      const render = (): string => graphHtml(FIXTURE_TEMPLATE, assets, 'n');

      expect(render).toThrow('unsafe webview slot value');
    });
  });

  describe('GIVEN a root folder name', () => {
    it('WHEN the title is made THEN it is Package Graph — and the name', () => {
      expect(graphTitleOf('ws')).toBe('Package Graph — ws');
    });
  });
});
