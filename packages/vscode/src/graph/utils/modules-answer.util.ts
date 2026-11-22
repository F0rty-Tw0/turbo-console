import { join } from 'node:path';

import { moduleGraphOf } from '@turbo-console/core';
import type { ModuleGraph, ModuleGraphInput, PackageImportScan, WorkspaceTarget } from '@turbo-console/core';
import { MANIFEST_FILE_MAX, MODULE_FILES_MAX, MODULE_LINKS_MAX, MODULE_STUB_NAME_MAX } from '@turbo-console/webview-ui';
import type { GraphPackage, ModuleLink, ModulesFound, ModulesResult } from '@turbo-console/webview-ui';

import { namesOf } from './manifest-entries.util.ts';
import { isRecord } from './record.util.ts';
import type { ModulesContext } from '../common/import-match.type.ts';

/** Old index → new index of every entry kept. */
type IndexMap = ReadonlyMap<number, number>;

/** The graph after the §5 trim: what the page gets of it, and how many files, stubs and links were left out. */
type TrimmedModules = {
  readonly files: string[];
  readonly tests: number[];
  readonly stubs: string[];
  readonly fileLinks: ModuleLink[];
  readonly stubLinks: ModuleLink[];
  readonly dropped: number;
};

const parsedOf = (text: string): unknown => {
  try {
    const parsed: unknown = JSON.parse(text);

    return parsed;
  } catch {
    return null;
  }
};

/** The manifest's `name` when it is a string; `null` for any other manifest, or none. */
const manifestNameOf = (text: string | null): string | null => {
  if (text === null) return null;

  const parsed = parsedOf(text);

  if (!isRecord(parsed) || !('name' in parsed)) return null;

  const { name } = parsed;

  return typeof name === 'string' ? name : null;
};

/** The manifest's name; else `''` for the root package, whose name never matches, and the listed name for any other. */
const selfNameOf = (ctx: ModulesContext): string => {
  const name = manifestNameOf(ctx.manifestText);
  const self = ctx.packages.find((pkg) => pkg.name === ctx.packageName);

  if (name !== null) return name;

  return self?.path === '' ? '' : ctx.packageName;
};

const targetOf = (ctx: ModulesContext, pkg: GraphPackage): WorkspaceTarget => {
  const names = namesOf(pkg.name, ctx.manifestText);
  const packageDir = join(ctx.root, pkg.path);
  const dir = pkg.path === '' ? null : packageDir;
  const target: WorkspaceTarget = { name: pkg.name, names, dir };

  return target;
};

/** Walks `entries` in order; `isKept` sees each entry and how many were kept before it. */
const keptIndexesOf = (entries: string[], isKept: (entry: string, kept: number) => boolean): IndexMap => {
  const indexes = new Map<number, number>();

  for (const [index, entry] of entries.entries()) {
    const isEntryKept = isKept(entry, indexes.size);

    if (isEntryKept) indexes.set(index, indexes.size);
  }

  return indexes;
};

const isFileKept = (file: string, kept: number): boolean => file.length <= MANIFEST_FILE_MAX && kept < MODULE_FILES_MAX;

const isStubKept = (stub: string): boolean => stub.length <= MODULE_STUB_NAME_MAX;

const pickedOf = (entries: string[], indexes: IndexMap): string[] => entries.filter((_entry, index) => indexes.has(index));

const reindexedOf = (indexes: number[], map: IndexMap): number[] => {
  const kept: number[] = [];

  for (const index of indexes) {
    const next = map.get(index);

    if (next !== undefined) kept.push(next);
  }

  return kept;
};

/** The links whose both ends are kept, re-indexed; the map is monotonic, so the (from, to) order holds. */
const relinkedOf = (links: ModuleLink[], froms: IndexMap, tos: IndexMap): ModuleLink[] => {
  const relinked: ModuleLink[] = [];

  for (const [from, to, statics, types, lazies] of links) {
    const nextFrom = froms.get(from);
    const nextTo = tos.get(to);

    if (nextFrom !== undefined && nextTo !== undefined) relinked.push([nextFrom, nextTo, statics, types, lazies]);
  }

  return relinked;
};

/**
 * The §5 trim: files past `MANIFEST_FILE_MAX` go first, then files past the first `MODULE_FILES_MAX` kept, then stubs past
 * `MODULE_STUB_NAME_MAX`; every link with a dropped end goes with it, counted once. What is left is re-indexed, and the
 * leading `fileLinks`, then the leading `stubLinks`, are sent up to `MODULE_LINKS_MAX` together.
 */
const trimmedModulesOf = (graph: ModuleGraph): TrimmedModules => {
  const fileIndexes = keptIndexesOf(graph.files, isFileKept);
  const stubIndexes = keptIndexesOf(graph.stubs, isStubKept);
  const relinkedFiles = relinkedOf(graph.fileLinks, fileIndexes, fileIndexes);
  const relinkedStubs = relinkedOf(graph.stubLinks, fileIndexes, stubIndexes);
  const fileLinks = relinkedFiles.slice(0, MODULE_LINKS_MAX);
  const stubLinks = relinkedStubs.slice(0, MODULE_LINKS_MAX - fileLinks.length);
  const droppedFiles = graph.files.length - fileIndexes.size;
  const droppedStubs = graph.stubs.length - stubIndexes.size;
  const droppedLinks = graph.fileLinks.length + graph.stubLinks.length - fileLinks.length - stubLinks.length;
  const files = pickedOf(graph.files, fileIndexes);
  const tests = reindexedOf(graph.tests, fileIndexes);
  const stubs = pickedOf(graph.stubs, stubIndexes);
  const trimmed: TrimmedModules = { files, tests, stubs, fileLinks, stubLinks, dropped: droppedFiles + droppedStubs + droppedLinks };

  return trimmed;
};

/**
 * The modules reply for one package from one scan of it (spec §6.1): the scan folded by `moduleGraphOf`, with every other
 * listed package a stub target (the root `//` owns no dir), then trimmed to the §5 caps. `scanned`, `skipped` and `limit`
 * are the scan's. Never mutates `scan`: its arrays are the import cache's own.
 */
export const answerModules = (scan: PackageImportScan, ctx: ModulesContext): ModulesResult => {
  const isOther = (pkg: GraphPackage): boolean => pkg.name !== ctx.packageName;
  const others = ctx.packages.filter(isOther).map((pkg) => targetOf(ctx, pkg));
  const input: ModuleGraphInput = { dir: ctx.dir, selfName: selfNameOf(ctx), scan, others };
  const graph = moduleGraphOf(input);
  const { files, tests, stubs, fileLinks, stubLinks, dropped } = trimmedModulesOf(graph);
  const { scanned, skipped, limit } = scan;
  const found: ModulesFound = {
    kind: 'found',
    files,
    tests,
    stubs,
    fileLinks,
    stubLinks,
    counts: graph.counts,
    scanned,
    skipped,
    limit,
    dropped
  };

  return found;
};
