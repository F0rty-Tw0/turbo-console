import { mergedLinksOf } from './merged-links.util.ts';
import { moduleDrawnOf } from './module-drawn.util.ts';
import type { ModuleLink, ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import { FILE_PREFIX } from '../common/graph-module.const.ts';
import type { DrawnEnds, MergedLink } from '../common/merged-links.type.ts';
import type { ModuleScene, ModuleSceneLink, ModuleSceneView, ModuleShown, ModuleStubLeaf } from '../common/module-scene.type.ts';
import type { ModuleTree } from '../common/module-tree.type.ts';

type ModuleLinkCounts = {
  readonly statics: number;
  readonly types: number;
  readonly lazies: number;
};

const NO_LINK_COUNTS: ModuleLinkCounts = { statics: 0, types: 0, lazies: 0 };

const fileEndsOf = (link: ModuleLink, drawnOf: ReadonlyMap<number, string>): DrawnEnds | null => {
  const [from, to] = link;
  const source = drawnOf.get(from);
  const target = drawnOf.get(to);

  if (source === undefined || target === undefined) return null;

  const ends: DrawnEnds = { source, target };

  return ends;
};

const stubEndsOf = (link: ModuleLink, drawnOf: ReadonlyMap<number, string>, stubs: string[]): DrawnEnds | null => {
  const [from, to] = link;
  const source = drawnOf.get(from);
  const name = stubs[to];

  if (source === undefined || name === undefined) return null;

  const ends: DrawnEnds = { source, target: `pkg:${name}` };

  return ends;
};

/** The link drawn between `ends`, with the kinds `shown` leaves out read as 0; null when an end is not drawn. */
const shownLinkOf = (ends: DrawnEnds | null, link: ModuleLink, shown: ModuleShown): ModuleSceneLink | null => {
  if (ends === null) return null;

  const [, , statics, types, lazies] = link;
  const shownTypes = shown.types ? types : 0;
  const shownLazies = shown.lazies ? lazies : 0;
  const item: ModuleSceneLink = { source: ends.source, target: ends.target, statics, types: shownTypes, lazies: shownLazies };

  return item;
};

/** The payload's file links, then its stub links, at their drawn ends; a link with an end not drawn is left out. */
const linkItemsOf = (data: ModulesFound, drawnOf: ReadonlyMap<number, string>, shown: ModuleShown): ModuleSceneLink[] => {
  const fileItems = data.fileLinks.map((link) => shownLinkOf(fileEndsOf(link, drawnOf), link, shown));
  const stubItems = data.stubLinks.map((link) => shownLinkOf(stubEndsOf(link, drawnOf, data.stubs), link, shown));
  const items = [...fileItems, ...stubItems];

  return items.filter((item) => item !== null);
};

const endsOfItem = (item: ModuleSceneLink): DrawnEnds => item;

const summed = (acc: ModuleLinkCounts | null, item: ModuleSceneLink): ModuleLinkCounts => {
  const base = acc ?? NO_LINK_COUNTS;
  const counts: ModuleLinkCounts = {
    statics: base.statics + item.statics,
    types: base.types + item.types,
    lazies: base.lazies + item.lazies
  };

  return counts;
};

const sceneLinkOf = (merged: MergedLink<ModuleLinkCounts>): ModuleSceneLink => {
  const { source, target, value } = merged;
  const link: ModuleSceneLink = { source, target, statics: value.statics, types: value.types, lazies: value.lazies };

  return link;
};

const hasImports = (link: ModuleSceneLink): boolean => link.statics + link.types + link.lazies > 0;

const stubLeafOf = (name: string): ModuleStubLeaf => {
  const leaf: ModuleStubLeaf = { kind: 'stub', id: `pkg:${name}`, name, label: name, parent: null };

  return leaf;
};

/**
 * What the module view draws for `view`: the walked tree's boxes and leaves, then the stubs a drawn link targets, in
 * `data.stubs` order. Links merge per drawn pair (self-pairs dropped), and a link left with no import shown is dropped.
 * `fileIds` lists every file the walk drew, as its own card or under a folder card, in `tree.files` order.
 */
export const moduleSceneOf = (tree: ModuleTree, data: ModulesFound, view: ModuleSceneView): ModuleScene => {
  const drawn = moduleDrawnOf(tree, data.tests, view);
  const items = linkItemsOf(data, drawn.drawnOf, view.shown);
  const merged = mergedLinksOf(items, endsOfItem, summed);
  const all = merged.map(sceneLinkOf);
  const links = all.filter(hasImports);
  const targets = new Set(links.map((link) => link.target));
  const drawnStubs = data.stubs.filter((name) => targets.has(`pkg:${name}`));
  const stubs = drawnStubs.map(stubLeafOf);
  const leaves = [...drawn.leaves, ...stubs];
  const isIncludedAt = (_: string, index: number): boolean => drawn.drawnOf.has(index);
  const paths = tree.files.filter(isIncludedAt);
  const fileIds = paths.map((path) => `${FILE_PREFIX}${path}`);
  const scene: ModuleScene = { boxes: drawn.boxes, leaves, links, leafCount: leaves.length, fileIds };

  return scene;
};
