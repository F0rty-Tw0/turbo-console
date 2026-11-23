import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import type { SourceImport } from '../common/import-scan.type.ts';
import type { ModuleGraphInput, WorkspaceTarget } from '../common/module-graph.type.ts';
import type { ModuleEnd, ModuleSitesQuery } from '../common/module-sites.type.ts';
import { moduleSitesOf } from '../utils/module-sites.util.ts';
import { A_DIR, Y_DIR } from './common/module-dirs.const.ts';
import { importOf, moduleScanOf } from './utils/module-scan.spec.util.ts';

const DIRS = 30;
const FILES_PER_DIR = 50;
const B_TARGET: WorkspaceTarget = { name: '@s/b', names: ['@s/b'], dir: Y_DIR };
const HUB_END: ModuleEnd = { kind: 'file', path: 'src/m0/f0.ts' };
const HUB_QUERY: ModuleSitesQuery = { from: HUB_END, to: null };

/**
 * `src/m<d>/f<i>.ts` imports its next sibling, the same file one dir over (type-only), the hub `src/m0/f0.ts`, `@s/b`
 * and `react`; files with `i % 5 < 2` also import the sibling after next dynamically.
 */
const importsOfFile = (dir: number, file: number): SourceImport[] => {
  const nextFile = (file + 1) % FILES_PER_DIR;
  const skipFile = (file + 2) % FILES_PER_DIR;
  const nextDir = (dir + 1) % DIRS;
  const isLazyFile = file % 5 < 2;

  const imports = [
    importOf(`./f${nextFile}.ts`),
    importOf(`../m${nextDir}/f${file}.ts`, { isType: true }),
    importOf('../m0/f0.ts'),
    importOf('@s/b'),
    importOf('react')
  ];

  const lazy = importOf(`./f${skipFile}.ts`, { kind: 'dynamic' });
  const withLazy = [...imports, lazy];

  return isLazyFile ? withLazy : imports;
};

/** 1,500 walked files with 8,100 imports, shaped like webview-ui; no file system. */
const inputOfTree = (): ModuleGraphInput => {
  const walked: string[] = [];
  const imports: Record<string, SourceImport[]> = {};

  for (let dir = 0; dir < DIRS; dir++) {
    for (let file = 0; file < FILES_PER_DIR; file++) {
      const path = `src/m${dir}/f${file}.ts`;

      walked.push(path);
      imports[path] = importsOfFile(dir, file);
    }
  }

  const others = [B_TARGET];
  const input: ModuleGraphInput = { dir: A_DIR, selfName: '@s/a', scan: moduleScanOf(walked, imports), others };

  return input;
};

const INPUT = inputOfTree();

const benches: BenchDescriptor[] = [bench('module-sites-1500', () => moduleSitesOf(INPUT, HUB_QUERY), { gate: true })];

export default benches;
