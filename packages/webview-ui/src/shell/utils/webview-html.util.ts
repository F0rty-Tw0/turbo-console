import type { WebviewSlots } from '../common/webview-html.type.ts';

const SLOT_MARKER = /\{\{([^}]*)\}\}/g;

const LEFTOVER_SLOT = /\{\{[^}]*\}\}/;

/** Slot values land in double-quoted attributes, so none may close the attribute or open a tag. */
const UNSAFE_SLOT_VALUE = /["<>]/;

const assertSafeSlots = (slots: WebviewSlots): void => {
  for (const [name, value] of Object.entries(slots)) {
    const isUnsafe = UNSAFE_SLOT_VALUE.test(value);

    if (isUnsafe) throw new Error(`unsafe webview slot value: {{${name}}}`);
  }
};

/**
 * Fills every `{{name}}` in `template` with `slots[name]` in one pass, so a value is never scanned for markers, then
 * throws `Error('unfilled webview slot: {{name}}')` naming the first marker still in the output (a missing slot, or a
 * value that holds a marker). A value holding `"`, `<` or `>` throws `Error('unsafe webview slot value: {{name}}')`.
 * Values are inserted raw: they are host-built (nonce, csp, URIs), never repo text, and are not HTML-escaped.
 */
export const renderWebviewHtml = (template: string, slots: WebviewSlots): string => {
  assertSafeSlots(slots);

  const fill = (marker: string, name: string): string => {
    const value = Object.hasOwn(slots, name) ? slots[name] : undefined;

    return value ?? marker;
  };
  const html = template.replace(SLOT_MARKER, fill);
  const leftover = LEFTOVER_SLOT.exec(html);

  if (leftover !== null) throw new Error(`unfilled webview slot: ${leftover[0]}`);

  return html;
};

/**
 * The Content-Security-Policy every webview page runs under; `cspSource` is `webview.cspSource` in VS Code. The
 * result goes through `renderWebviewHtml` raw: pass a host-built nonce and `cspSource`, never repo text.
 */
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
