import { describe, expect, it } from 'vitest';

import { renderWebviewHtml, webviewCsp } from './webview-html.util.ts';

const SPEC_CSP =
  "default-src 'none'; script-src 'nonce-n'; style-src vscode-resource: 'nonce-n'; font-src vscode-resource:; img-src vscode-resource: data:; base-uri 'none'; form-action 'none'";

describe('FEATURE: webview html', () => {
  describe('GIVEN a template with csp and nonce slots', () => {
    const template = '<meta content="{{csp}}"><script nonce="{{nonce}}"></script><style nonce="{{nonce}}"></style>';

    it('WHEN rendered THEN every occurrence of each slot is filled', () => {
      const html = renderWebviewHtml(template, { csp: 'c', nonce: 'n' });

      expect(html).toBe('<meta content="c"><script nonce="n"></script><style nonce="n"></style>');
    });

    it('WHEN a slot value holds a dollar pattern THEN it is inserted literally', () => {
      const html = renderWebviewHtml('{{csp}}', { csp: "$& $' $1" });

      expect(html).toBe("$& $' $1");
    });
  });

  describe('GIVEN a template with a slot that has no value', () => {
    it('WHEN rendered THEN it throws naming the unfilled slot', () => {
      const render = (): string => renderWebviewHtml('<script src="{{scriptUri}}"></script>', { csp: 'c' });

      expect(render).toThrow('unfilled webview slot: {{scriptUri}}');
    });

    it('WHEN several are unfilled THEN it names the first', () => {
      const render = (): string => renderWebviewHtml('{{first}} {{second}}', {});

      expect(render).toThrow('unfilled webview slot: {{first}}');
    });
  });

  describe('GIVEN a slot value that itself holds a slot marker', () => {
    it('WHEN rendered THEN it throws, as the host built a bad value', () => {
      const render = (): string => renderWebviewHtml('{{csp}}', { csp: 'a {{x}} b' });

      expect(render).toThrow('unfilled webview slot: {{x}}');
    });
  });

  describe('GIVEN a nonce and a cspSource', () => {
    it('WHEN the csp is built THEN it is the spec string', () => {
      expect(webviewCsp('n', 'vscode-resource:')).toBe(SPEC_CSP);
    });
  });
});
