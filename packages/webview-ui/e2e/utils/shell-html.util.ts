import { UNNONCED_SCRIPT } from '../common/shell.const.ts';

const webviewCsp = (nonce: string): string =>
  `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src data:; worker-src blob:; base-uri 'none'; form-action 'none'`;

/** Fills the `{{csp}}` and `{{nonce}}` slots of `src/graph/index.html`, optionally adding an un-nonced inline script. */
export const renderShellHtml = (template: string, nonce: string, inlineScript: boolean): string => {
  const csp = webviewCsp(nonce);
  const html = template.replaceAll('{{csp}}', csp).replaceAll('{{nonce}}', nonce);

  if (!inlineScript) return html;

  return html.replace('</body>', `${UNNONCED_SCRIPT}</body>`);
};
