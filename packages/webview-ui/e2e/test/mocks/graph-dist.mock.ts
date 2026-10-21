import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Route } from '@playwright/test';

import { graphCsp, renderWebviewHtml } from '../../../src/shell/utils/webview-html.util.ts';
import { GRAPH_DIST_DIR } from '../../common/graph.const.ts';
import type { GraphOptions } from '../../common/graph.type.ts';
import type { RouteHandler } from '../../common/playwright.type.ts';
import { SHELL_ORIGIN, UNNONCED_SCRIPT } from '../../common/shell.const.ts';

const withUnnoncedScript = (html: string): string => html.replace('</body>', `${UNNONCED_SCRIPT}</body>`);

const fulfillGraphHtml = async (route: Route, options: GraphOptions): Promise<void> => {
  const template = await readFile(join(GRAPH_DIST_DIR, 'index.html'), 'utf8');
  const nonce = randomBytes(16).toString('base64');
  const csp = graphCsp(nonce, SHELL_ORIGIN);
  const html = renderWebviewHtml(template, { csp, nonce, scriptUri: 'main.js', styleUri: 'graph.css' });

  if (options.inlineScript !== true) return route.fulfill({ body: html, contentType: 'text/html' });

  await route.fulfill({ body: withUnnoncedScript(html), contentType: 'text/html' });
};

/** Serves the built `dist/graph/` files; `index.html` gets the graph CSP and a fresh nonce per request. */
export const graphDistMock = (options: GraphOptions = {}): RouteHandler => {
  return async (route: Route): Promise<void> => {
    const url = new URL(route.request().url());
    const fileName = url.pathname.slice(1);

    if (fileName === 'index.html') return fulfillGraphHtml(route, options);

    await route.fulfill({ path: join(GRAPH_DIST_DIR, fileName) });
  };
};
