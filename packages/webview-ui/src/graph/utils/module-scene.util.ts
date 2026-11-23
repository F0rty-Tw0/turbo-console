import { mergedLinksOf } from './merged-links.util.ts';
import { moduleDrawnOf } from './module-drawn.util.ts';
import { focusSetOf } from './module-focus.util.ts';
import type { ModuleLink, ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import { FILE_PREFIX, STUB_PREFIX } from '../common/graph-module.const.ts';
import type { DrawnEnds, MergedLink } from '../common/merged-links.type.ts';
import type {
  ModuleFocusSet,
  ModuleScene,
  ModuleSceneLink,
  ModuleSceneView,
  ModuleShown,
  ModuleStubLeaf
} from '../common/module-scene.type.ts';
import type { ModuleTree } from '../common/module-tree.type.ts';

type ModuleLinkCounts = {
  readonly statics: number;
  readonly types: number;
  readonly lazies: number;
};

/** What the tree walk opens and leaves out, and the focus set it is narrowed to (`null` with no focus). */
type DrawRules = {
  readonly expanded: string[];
  readonly hidden: ReadonlySet<number>;
  readonly focus: ModuleFocusSet | null;
};

const NO_LINK_COUNTS: ModuleLinkCounts = { statics: 0, types: 0, lazies: 0 };

const NO_FILES: number[] = [];

const fileEndsOf = (link: ModuleLink, drawnOf: ReadonlyMap<number, string>): DrawnEnds | null => {
  const [from, to] = link;
  const source = drawnOf.get(from);
  const target = drawnOf.get(to);

  if (source === undefined || target === undefined) return null;

  const ends: DrawnEnds = { source, target };

  return ends;
};

/** A stub link's drawn ends; null when its file is not drawn or the focus leaves its stub out. */
const stubEndsOf = (link: ModuleLink, drawnOf: ReadonlyMap<number, string>, stubs: string[], rules: DrawRules): DrawnEnds | null => {
  const [from, to] = link;
  const source = drawnOf.get(from);
  const name = stubs[to];

  if (source === undefined || name === undefined) return null;

  const isKept = rules.focus?.stubs.has(name) ?? true;

  if (!isKept) return null;

  const ends: DrawnEnds = { source, target: `${STUB_PREFIX}${name}` };

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

/** The payload's file links, then its stub links, at their drawn ends; a link with an end not drawn or out of focus is left out. */
const linkItemsOf = (
  data: ModulesFound,
  drawnOf: ReadonlyMap<number, string>,
  view: ModuleSceneView,
  rules: DrawRules
): ModuleSceneLink[] => {
  const { shown } = view;
  const fileItems = data.fileLinks.map((link) => shownLinkOf(fileEndsOf(link, drawnOf), link, shown));
  const stubItems = data.stubLinks.map((link) => shownLinkOf(stubEndsOf(link, drawnOf, data.stubs, rules), link, shown));
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
  const leaf: ModuleStubLeaf = { kind: 'stub', id: `${STUB_PREFIX}${name}`, name, label: name, parent: null };

  return leaf;
};

/** The folders above `path`, outermost first: `src/lib/b.ts` → `src`, `src/lib`. */
const ancestorsOf = (path: string): string[] => {
  const folders = path.split('/').slice(0, -1);
  const prefixOf = (_: string, at: number): string => folders.slice(0, at + 1).join('/');

  return folders.map(prefixOf);
};

/**
 * With no focus, the saved expansion with tests hidden unless shown. With one, the saved expansion plus every ancestor
 * folder of a focus file, and every file outside the focus set hidden; `view.expanded` itself is never written.
 */
const drawRulesOf = (tree: ModuleTree, data: ModulesFound, view: ModuleSceneView): DrawRules => {
  if (view.focus === null) {
    const hiddenTests = view.shown.tests ? NO_FILES : data.tests;
    const plain: DrawRules = { expanded: view.expanded, hidden: new Set(hiddenTests), focus: null };

    return plain;
  }

  const focus = focusSetOf(data, view.shown, view.focus);
  const isFocusAt = (_: string, index: number): boolean => focus.files.has(index);
  const focusPaths = tree.files.filter(isFocusAt);
  const opened = focusPaths.flatMap(ancestorsOf);
  const expanded = [...view.expanded, ...opened];
  const indexes = tree.files.map((_, index) => index);
  const outside = indexes.filter((index) => !focus.files.has(index));
  const focused: DrawRules = { expanded, hidden: new Set(outside), focus };

  return focused;
};

/**
 * What the module view draws for `view`: the walked tree's boxes and leaves, then the stubs a drawn link targets, in
 * `data.stubs` order. Links merge per drawn pair (self-pairs dropped), and a link left with no import shown is dropped.
 * `fileIds` lists every file the walk drew, as its own card or under a folder card, in `tree.files` order. With a focus,
 * only its files and stubs are drawn, and a target stub is drawn even when no drawn link targets it (C11).
 */
export const moduleSceneOf = (tree: ModuleTree, data: ModulesFound, view: ModuleSceneView): ModuleScene => {
  const rules = drawRulesOf(tree, data, view);
  const drawn = moduleDrawnOf(tree, rules.expanded, rules.hidden);
  const items = linkItemsOf(data, drawn.drawnOf, view, rules);
  const merged = mergedLinksOf(items, endsOfItem, summed);
  const all = merged.map(sceneLinkOf);
  const links = all.filter(hasImports);
  const targets = new Set(links.map((link) => link.target));
  const isDrawnStub = (name: string): boolean => {
    const id = `${STUB_PREFIX}${name}`;

    return targets.has(id) || id === view.focus?.target;
  };
  const drawnStubs = data.stubs.filter(isDrawnStub);
  const stubs = drawnStubs.map(stubLeafOf);
  const leaves = [...drawn.leaves, ...stubs];
  const isIncludedAt = (_: string, index: number): boolean => drawn.drawnOf.has(index);
  const paths = tree.files.filter(isIncludedAt);
  const fileIds = paths.map((path) => `${FILE_PREFIX}${path}`);
  const scene: ModuleScene = { boxes: drawn.boxes, leaves, links, leafCount: leaves.length, fileIds };

  return scene;
};
