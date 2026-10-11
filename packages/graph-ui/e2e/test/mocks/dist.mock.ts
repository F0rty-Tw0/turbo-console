import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Route } from '@playwright/test';

import type { RouteHandler } from '../../common/playwright.type.ts';
import type { ShellOptions } from '../../common/shell.type.ts';
import { renderShellHtml } from '../../utils/shell-html.util.ts';

const DIST_DIR = join(import.meta.dirname, '../../../dist');

const fulfillShellHtml = async (route: Route, options: ShellOptions): Promise<void> => {
  const template = await readFile(join(DIST_DIR, 'index.html'), 'utf8');
  const nonce = randomBytes(16).toString('base64');
  const body = renderShellHtml(template, nonce, options.inlineScript ?? false);

  await route.fulfill({ body, contentType: 'text/html' });
};

/** Serves the built `dist/` files; `index.html` gets the webview CSP and a fresh nonce per request. */
export const distMock = (options: ShellOptions = {}): RouteHandler => {
  return async (route: Route): Promise<void> => {
    const url = new URL(route.request().url());
    const fileName = url.pathname.slice(1);

    if (fileName === 'index.html') return fulfillShellHtml(route, options);

    await route.fulfill({ path: join(DIST_DIR, fileName) });
  };
};
