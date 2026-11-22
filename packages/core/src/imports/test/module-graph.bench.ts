import { bench } from '@turbo-console/tools';
import type { BenchDescriptor } from '@turbo-console/tools';

import type { SourceImport } from '../common/import-scan.type.ts';
import type { ModuleGraphInput, WorkspaceTarget } from '../common/module-graph.type.ts';
import { moduleGraphOf } from '../utils/module-graph.util.ts';
import { A_DIR, Y_DIR } from './common/module-dirs.const.ts';
import { importOf, moduleScanOf } from './utils/module-scan.spec.util.ts';

const DIRS = 50;
const FILES_PER_DIR = 100;
const B_TARGET: WorkspaceTarget = { name: '@s/b', names: ['@s/b'], dir: Y_DIR };

/** `src/m<d>/f<i>.ts` imports its next sibling, the same file one dir over (type-only), `@s/b` and `react`. */
const importsOfFile = (dir: number, file: number): SourceImport[] => {
  const nextFile = (file + 1) % FILES_PER_DIR;
  const nextDir = (dir + 1) % DIRS;

  return [importOf(`./f${nextFile}.js`), importOf(`../m${nextDir}/f${file}`, { isType: true }), importOf('@s/b'), importOf('react')];
};

/** 5,000 walked files with 4 imports each, 20,000 in all; no file system. */
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

const benches: BenchDescriptor[] = [bench('module-graph-5000', () => moduleGraphOf(INPUT), { gate: true })];

export default benches;
