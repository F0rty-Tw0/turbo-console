import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Route } from '@playwright/test';

import { renderWebviewHtml, webviewCsp } from '../../../src/shell/utils/webview-html.util.ts';
import type { RouteHandler } from '../../common/playwright.type.ts';
import { SHELL_ORIGIN, UNNONCED_SCRIPT } from '../../common/shell.const.ts';
import type { ShellOptions } from '../../common/shell.type.ts';

const DIST_DIR = join(import.meta.dirname, '../../../dist/graph');

const withUnnoncedScript = (html: string): string => html.replace('</body>', `${UNNONCED_SCRIPT}</body>`);

const fulfillShellHtml = async (route: Route, options: ShellOptions): Promise<void> => {
  const template = await readFile(join(DIST_DIR, 'index.html'), 'utf8');
  const nonce = randomBytes(16).toString('base64');
  const csp = webviewCsp(nonce, SHELL_ORIGIN);
  const html = renderWebviewHtml(template, { csp, nonce, scriptUri: 'main.js', styleUri: 'graph.css' });

  if (options.inlineScript !== true) return route.fulfill({ body: html, contentType: 'text/html' });

  await route.fulfill({ body: withUnnoncedScript(html), contentType: 'text/html' });
};

/** Serves the built `dist/graph/` files; `index.html` gets the webview CSP and a fresh nonce per request. */
export const distMock = (options: ShellOptions = {}): RouteHandler => {
  return async (route: Route): Promise<void> => {
    const url = new URL(route.request().url());
    const fileName = url.pathname.slice(1);

    if (fileName === 'index.html') return fulfillShellHtml(route, options);

    await route.fulfill({ path: join(DIST_DIR, fileName) });
  };
};
