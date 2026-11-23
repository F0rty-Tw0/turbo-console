import { join, resolve } from 'node:path';

import { ImportFileCache, scanPackageImports } from '@turbo-console/core';
import type { ImportScanInput, ModuleSitesQuery } from '@turbo-console/core';
import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';
import type { ModuleEnd, ModuleSitesResult } from '@turbo-console/webview-ui';

import type { ModulesContext } from '../common/import-match.type.ts';
import { answerModuleSites } from '../utils/module-sites-answer.util.ts';
import { graphPackageOf } from './utils/graph-model.spec.util.ts';

const ROOT = resolve(import.meta.dirname, '../../../../..');

const DIR = join(ROOT, 'packages', 'webview-ui');

const WEBVIEW_PACKAGE = graphPackageOf('@turbo-console/webview-ui', 'packages/webview-ui');

const CORE_PACKAGE = graphPackageOf('@turbo-console/core', 'packages/core');

const CTX: ModulesContext = {
  root: ROOT,
  packageName: '@turbo-console/webview-ui',
  dir: DIR,
  packages: [WEBVIEW_PACKAGE, CORE_PACKAGE],
  manifestText: null
};

/** The file AC 6 taps. */
const CONTROLLER_END: ModuleEnd = { kind: 'file', path: 'src/graph/domain-logic/graph-controller.ts' };

const QUERY: ModuleSitesQuery = { from: CONTROLLER_END, to: null };

const CACHE = new ImportFileCache();

const inputOf = (): ImportScanInput => {
  const signal = new AbortController().signal;
  const input: ImportScanInput = { dir: DIR, root: ROOT, skipDirs: new Set<string>(), cache: CACHE, signal };

  return input;
};

const WARM_SCAN = await scanPackageImports(inputOf());

const CHECKED = answerModuleSites(WARM_SCAN, CTX, QUERY);

const IS_EXPECTED = CHECKED.kind === 'found' && CHECKED.imports.length > 0;

if (!IS_EXPECTED) throw new Error('module-sites-answer fixture drifted from its expected answer');

/** One Details ask per sample: a rescan through the warm cache, then the answer; not gated, since file-system time varies (spec C16). */
const askSites = async (): Promise<ModuleSitesResult> => answerModuleSites(await scanPackageImports(inputOf()), CTX, QUERY);

const benches: BenchDescriptor[] = [bench('module-sites-answer', askSites, { gate: false })];

export default benches;
