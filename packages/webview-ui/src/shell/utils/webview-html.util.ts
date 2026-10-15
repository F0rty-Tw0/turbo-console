import type { WebviewSlots } from '../common/webview-html.type.ts';

const LEFTOVER_SLOT = /\{\{[^}]*\}\}/;

/**
 * Replaces every `{{name}}` in `template` with `slots[name]`, then throws `Error('unfilled webview slot: {{name}}')`
 * naming the first marker still left. The scan runs on the output, so a slot value that holds a marker also throws:
 * slot values come from the host, which makes that a host bug.
 */
export const renderWebviewHtml = (template: string, slots: WebviewSlots): string => {
  let html = template;

  for (const [name, value] of Object.entries(slots)) html = html.replaceAll(`{{${name}}}`, () => value);

  const leftover = LEFTOVER_SLOT.exec(html);

  if (leftover !== null) throw new Error(`unfilled webview slot: ${leftover[0]}`);

  return html;
};

/** The Content-Security-Policy every webview page runs under; `cspSource` is `webview.cspSource` in VS Code. */
export const webviewCsp = (nonce: string, cspSource: string): string => {
  const directives = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src ${cspSource} 'nonce-${nonce}'`,
    `font-src ${cspSource}`,
    `img-src ${cspSource} data:`,
    "base-uri 'none'",
    "form-action 'none'"
  ];

  return directives.join('; ');
};
