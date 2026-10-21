import { describe, expect, it } from 'vitest';

import { graphCsp, renderWebviewHtml, webviewCsp } from './webview-html.util.ts';

const SPEC_CSP =
  "default-src 'none'; script-src 'nonce-n'; style-src vscode-resource: 'nonce-n'; font-src vscode-resource:; img-src vscode-resource: data:; base-uri 'none'; form-action 'none'; require-trusted-types-for 'script'; trusted-types 'none'";

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

  describe('GIVEN a slot value that holds the marker of another slot', () => {
    const template = '{{csp}} {{nonce}}';

    it('WHEN the earlier slot holds a later marker THEN it throws, the value is not filled', () => {
      const render = (): string => renderWebviewHtml(template, { csp: 'x {{nonce}}', nonce: 'N' });

      expect(render).toThrow('unfilled webview slot: {{nonce}}');
    });

    it('WHEN the later slot holds an earlier marker THEN it throws, the value is not filled', () => {
      const render = (): string => renderWebviewHtml(template, { nonce: '{{csp}}', csp: 'C' });

      expect(render).toThrow('unfilled webview slot: {{csp}}');
    });
  });

  describe('GIVEN a slot value with an attribute or tag delimiter', () => {
    it.each([['"'], ['<'], ['>']])('WHEN a value holds %s THEN it throws naming the slot', (character) => {
      const render = (): string => renderWebviewHtml('<meta content="{{csp}}">', { csp: `a${character}b` });

      expect(render).toThrow('unsafe webview slot value: {{csp}}');
    });
  });

  describe('GIVEN the values the host really passes', () => {
    it('WHEN a nonce, a cspSource and the csp are rendered THEN none is refused', () => {
      const nonce = 'a+b/c1==';
      const cspSource = 'https://*.vscode-cdn.net';
      const csp = webviewCsp(nonce, cspSource);

      const html = renderWebviewHtml('{{csp}}|{{nonce}}|{{source}}', { csp, nonce, source: cspSource });

      expect(html).toBe(`${csp}|${nonce}|${cspSource}`);
    });
  });

  describe('GIVEN a nonce and a cspSource', () => {
    it('WHEN the csp is built THEN it is the spec string', () => {
      expect(webviewCsp('n', 'vscode-resource:')).toBe(SPEC_CSP);
    });
  });

  describe('GIVEN a nonce and a cspSource for the graph page', () => {
    it('WHEN the graph csp is built THEN it is the base csp with trusted-types tc-elk and worker-src blob:', () => {
      const base = webviewCsp('n', 'vscode-resource:');

      const csp = graphCsp('n', 'vscode-resource:');

      expect(csp).toBe(`${base.replace("trusted-types 'none'", 'trusted-types tc-elk')}; worker-src blob:`);
    });

    it('WHEN the graph csp is built THEN it holds no unsafe-eval, unsafe-inline or connect-src', () => {
      expect(graphCsp('n', 'vscode-resource:')).not.toMatch(/unsafe-eval|unsafe-inline|connect-src/);
    });
  });
});
