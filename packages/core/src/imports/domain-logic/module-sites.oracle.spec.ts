import { resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { scanPackageImports } from './scan-package-imports.ts';
import type { PackageImportScan } from '../common/import-scan.type.ts';
import type { ModuleGraph, ModuleGraphInput, ModuleLink } from '../common/module-graph.type.ts';
import { ImportFileCache } from '../data-access/import-file-cache.ts';
import { fileEndOf, queryOf } from '../test/utils/module-sites.spec.util.ts';
import { capsOf } from '../test/utils/scan-caps.spec.util.ts';
import { inputOf } from '../test/utils/scan-input.spec.util.ts';
import { moduleGraphOf } from '../utils/module-graph.util.ts';
import { moduleSitesOf } from '../utils/module-sites.util.ts';

type FileIncoming = {
  readonly path: string;
  readonly importers: number;
  readonly rows: number;
};

const DIR = resolve(import.meta.dirname, '../../../../webview-ui');
const SCAN_TIMEOUT_MS = 60_000;

const rowsOfLink = ([, , statics, types, lazies]: ModuleLink): number => statics + types + lazies;

const sumOf = (total: number, link: ModuleLink): number => total + rowsOfLink(link);

const pathOf = (graph: ModuleGraph, index: number): string => graph.files[index] ?? '';

/** One `<from> -> <to>: link <n>, sites <m>` line per file link whose (file, file) sites count differs from its columns. */
const linkMismatchesOf = (input: ModuleGraphInput, graph: ModuleGraph): string[] => {
  const mismatches: string[] = [];

  for (const link of graph.fileLinks) {
    const fromPath = pathOf(graph, link[0]);
    const toPath = pathOf(graph, link[1]);
    const sites = moduleSitesOf(input, queryOf(fileEndOf(fromPath), fileEndOf(toPath)));
    const linkRows = rowsOfLink(link);
    const isMismatch = sites.imports.length !== linkRows;

    if (isMismatch) mismatches.push(`${fromPath} -> ${toPath}: link ${linkRows}, sites ${sites.imports.length}`);
  }

  return mismatches;
};

const incomingOf = (graph: ModuleGraph): FileIncoming[] => {
  const linksByTo = Map.groupBy(graph.fileLinks, ([, to]) => to);

  const entryOf = (path: string, file: number): FileIncoming => {
    const links = linksByTo.get(file) ?? [];
    const entry: FileIncoming = { path, importers: links.length, rows: links.reduce(sumOf, 0) };

    return entry;
  };

  const incoming = graph.files.map(entryOf);

  return incoming;
};

const byPath = (left: FileIncoming, right: FileIncoming): number => (left.path < right.path ? -1 : 1);

const byImporters = (left: FileIncoming, right: FileIncoming): number => right.importers - left.importers || byPath(left, right);

/** The 20 files with the most importers, the first 20 by path with exactly one, and the first 10 by path with none. */
const sampleOf = (graph: ModuleGraph): FileIncoming[] => {
  const sorted = incomingOf(graph).toSorted(byPath);
  const most = sorted.toSorted(byImporters).slice(0, 20);
  const single = sorted.filter((entry) => entry.importers === 1).slice(0, 20);
  const none = sorted.filter((entry) => entry.importers === 0).slice(0, 10);
  const sample = [...most, ...single, ...none];

  return sample;
};

const sampleMismatchesOf = (input: ModuleGraphInput, sample: FileIncoming[]): string[] => {
  const mismatches: string[] = [];

  for (const entry of sample) {
    const sites = moduleSitesOf(input, queryOf(fileEndOf(entry.path), null));
    const isMismatch = sites.importedBy.length !== entry.rows;

    if (isMismatch) mismatches.push(`${entry.path}: links ${entry.rows}, importedBy ${sites.importedBy.length}`);
  }

  return mismatches;
};

describe('FEATURE: module sites agree with the module link counts', () => {
  describe('GIVEN a scan of the webview-ui package and its module graph', () => {
    let input: ModuleGraphInput;
    let graph: ModuleGraph;

    beforeAll(async () => {
      const caps = capsOf({ timeMs: SCAN_TIMEOUT_MS });
      const scan: PackageImportScan = await scanPackageImports(inputOf(DIR, new ImportFileCache(), { caps }));

      input = { dir: DIR, selfName: '@turbo-console/webview-ui', scan, others: [] };
      graph = moduleGraphOf(input);
    }, SCAN_TIMEOUT_MS);

    it(
      'WHEN every file link is asked as a (file, file) query THEN each gives exactly statics + types + lazies rows',
      () => {
        const linkMismatches = linkMismatchesOf(input, graph);

        expect(graph.fileLinks.length).toBeGreaterThan(0);
        expect(linkMismatches).toStrictEqual([]);
      },
      SCAN_TIMEOUT_MS
    );

    it(
      'WHEN 50 sampled files are asked with to null THEN each importedBy count is the sum of its incoming link counts',
      () => {
        const sample = sampleOf(graph);
        const sampleMismatches = sampleMismatchesOf(input, sample);

        expect(sample).toHaveLength(50);
        expect(sampleMismatches).toStrictEqual([]);
      },
      SCAN_TIMEOUT_MS
    );
  });
});
