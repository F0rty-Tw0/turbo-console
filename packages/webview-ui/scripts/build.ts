import { execFileSync } from 'node:child_process';
import { cpSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { build } from 'esbuild';
import type { BuildOptions, BuildResult, OnLoadArgs, OnLoadResult, Plugin } from 'esbuild';

const PACKAGE_ROOT = join(import.meta.dirname, '..');

const TSC = join(PACKAGE_ROOT, '../../node_modules/typescript7/bin/tsc');

const CODICONS = 'node_modules/@vscode/codicons';

const BUNDLE: BuildOptions = { bundle: true, logLevel: 'info' };

const BROWSER_BUNDLE: BuildOptions = { ...BUNDLE, platform: 'browser', format: 'iife', target: 'es2024' };

/** The graph bundle holds the ELK worker source as a string, for the page's blob worker. */
const elkWorkerText: Plugin = {
  name: 'elk-worker-text',
  setup: (pluginBuild) => {
    const asText = (args: OnLoadArgs): OnLoadResult => {
      const loaded: OnLoadResult = { contents: readFileSync(args.path, 'utf8'), loader: 'text' };

      return loaded;
    };

    pluginBuild.onLoad({ filter: /elk-worker\.min\.js$/ }, asText);
  }
};

const BUNDLES: BuildOptions[] = [
  { ...BROWSER_BUNDLE, entryPoints: ['src/graph/main.ts'], outfile: 'dist/graph/main.js', plugins: [elkWorkerText] },
  { ...BROWSER_BUNDLE, entryPoints: ['src/details/main.ts'], outfile: 'dist/details/main.js' },
  { ...BUNDLE, platform: 'neutral', format: 'esm', entryPoints: ['src/index.ts'], outfile: 'dist/lib/index.js' }
];

/** [source, destination] pairs, relative to the package root, copied unchanged beside the bundles. */
const COPIED_FILES: [string, string][] = [
  ['src/graph/index.html', 'dist/graph/index.html'],
  ['src/styles/graph.css', 'dist/graph/graph.css'],
  ['node_modules/elkjs/LICENSE.md', 'dist/graph/elkjs-LICENSE.md'],
  ['src/graph/THIRD-PARTY-NOTICES.md', 'dist/graph/THIRD-PARTY-NOTICES.md'],
  ['src/details/index.html', 'dist/details/index.html'],
  ['src/styles/details.css', 'dist/details/details.css'],
  [`${CODICONS}/dist/codicon.css`, 'dist/details/codicon.css'],
  [`${CODICONS}/dist/codicon.ttf`, 'dist/details/codicon.ttf'],
  [`${CODICONS}/LICENSE`, 'dist/details/LICENSE'],
  [`${CODICONS}/LICENSE-CODE`, 'dist/details/LICENSE-CODE']
];

const TSC_ARGS = [TSC, '-p', 'tsconfig.lib.json'];

const bundle = async (options: BuildOptions): Promise<BuildResult> => build({ ...options, absWorkingDir: PACKAGE_ROOT });

const bundles = BUNDLES.map(bundle);

await Promise.all(bundles);

for (const [from, to] of COPIED_FILES) cpSync(join(PACKAGE_ROOT, from), join(PACKAGE_ROOT, to));

execFileSync(process.execPath, TSC_ARGS, { cwd: PACKAGE_ROOT, stdio: 'inherit' });
