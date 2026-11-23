import { importOf, moduleScanOf } from './module-scan.spec.util.ts';
import type { SourceImport } from '../../common/import-scan.type.ts';
import type { ModuleGraphInput, WorkspaceTarget } from '../../common/module-graph.type.ts';
import type { ModuleEnd, ModuleSitesQuery } from '../../common/module-sites.type.ts';
import { A_DIR, Y_DIR } from '../common/module-dirs.const.ts';

export const fileEndOf = (path: string): ModuleEnd => {
  const end: ModuleEnd = { kind: 'file', path };

  return end;
};

export const dirEndOf = (path: string): ModuleEnd => {
  const end: ModuleEnd = { kind: 'dir', path };

  return end;
};

export const stubEndOf = (name: string): ModuleEnd => {
  const end: ModuleEnd = { kind: 'stub', name };

  return end;
};

export const queryOf = (from: ModuleEnd, to: ModuleEnd | null): ModuleSitesQuery => {
  const query: ModuleSitesQuery = { from, to };

  return query;
};

/**
 * Package `@s/a` at `A_DIR` with 5 walked files and 13 imports: `react` is external, `src/a/x.ts` line 4 imports
 * itself and line 5 is unresolved; `@s/b` is the one other workspace package.
 */
export const sitesInputOf = (): ModuleGraphInput => {
  const walked = ['src/a/x.ts', 'src/a/y.ts', 'src/ab/z.ts', 'src/lib/c.ts', 'src/main.ts'];

  const xImports: SourceImport[] = [
    importOf('./y'),
    importOf('../lib/c', { line: 1, isType: true }),
    importOf('@s/b', { line: 2 }),
    importOf('react', { line: 3 }),
    importOf('./x', { line: 4 }),
    importOf('./gone', { line: 5 })
  ];

  const yImports: SourceImport[] = [importOf('../lib/c', { kind: 'dynamic' })];
  const zImports: SourceImport[] = [importOf('../a/x'), importOf('../lib/c', { line: 1 })];
  const cImports: SourceImport[] = [importOf('@s/b', { line: 2, kind: 'require' })];
  const mainImports: SourceImport[] = [
    importOf('./a/x', { kind: 'reexport' }),
    importOf('./ab/z', { line: 1 }),
    importOf('./lib/c', { line: 3 })
  ];

  const imports: Record<string, SourceImport[]> = {
    'src/a/x.ts': xImports,
    'src/a/y.ts': yImports,
    'src/ab/z.ts': zImports,
    'src/lib/c.ts': cImports,
    'src/main.ts': mainImports
  };

  const others: WorkspaceTarget[] = [{ name: '@s/b', names: ['@s/b'], dir: Y_DIR }];
  const input: ModuleGraphInput = { dir: A_DIR, selfName: '@s/a', scan: moduleScanOf(walked, imports), others };

  return input;
};
