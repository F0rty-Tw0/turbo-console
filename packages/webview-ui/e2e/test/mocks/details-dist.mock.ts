import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Route } from '@playwright/test';

import type { WebviewSlots } from '../../../src/shell/common/webview-html.type.ts';
import { renderWebviewHtml, webviewCsp } from '../../../src/shell/utils/webview-html.util.ts';
import type { RouteHandler } from '../../common/playwright.type.ts';
import { SHELL_ORIGIN } from '../../common/shell.const.ts';

const DIST_DIR = join(import.meta.dirname, '../../../dist/details');

const fulfillDetailsHtml = async (route: Route): Promise<void> => {
  const template = await readFile(join(DIST_DIR, 'index.html'), 'utf8');
  const nonce = randomBytes(16).toString('base64');
  const csp = webviewCsp(nonce, SHELL_ORIGIN);
  const slots: WebviewSlots = { csp, nonce, scriptUri: 'main.js', styleUri: 'details.css', codiconUri: 'codicon.css' };
  const html = renderWebviewHtml(template, slots);

  await route.fulfill({ body: html, contentType: 'text/html' });
};

/** Serves the built `dist/details/` files; `index.html` gets the webview CSP, a fresh nonce and its asset slots. */
export const detailsDistMock = (): RouteHandler => {
  return async (route: Route): Promise<void> => {
    const url = new URL(route.request().url());
    const fileName = url.pathname.slice(1);

    if (fileName === 'index.html') return fulfillDetailsHtml(route);

    await route.fulfill({ path: join(DIST_DIR, fileName) });
  };
};
