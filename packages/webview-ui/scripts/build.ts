import { execFileSync } from 'node:child_process';
import { cpSync } from 'node:fs';
import { join } from 'node:path';

import { build } from 'esbuild';
import type { BuildOptions, BuildResult } from 'esbuild';

const PACKAGE_ROOT = join(import.meta.dirname, '..');

const TSC = join(PACKAGE_ROOT, '../../node_modules/typescript7/bin/tsc');

const CODICONS = 'node_modules/@vscode/codicons';

const BROWSER_BUNDLE: BuildOptions = { bundle: true, platform: 'browser', format: 'iife', target: 'es2024' };

const BUNDLES: BuildOptions[] = [
  { ...BROWSER_BUNDLE, entryPoints: ['src/graph/main.ts'], outfile: 'dist/graph/main.js' },
  { ...BROWSER_BUNDLE, entryPoints: ['src/details/main.ts'], outfile: 'dist/details/main.js' },
  { bundle: true, platform: 'neutral', format: 'esm', entryPoints: ['src/index.ts'], outfile: 'dist/lib/index.js' }
];

/** [source, destination] pairs, relative to the package root, copied unchanged beside the bundles. */
const COPIED_FILES: [string, string][] = [
  ['src/graph/index.html', 'dist/graph/index.html'],
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
