import { indexesOf, largeState } from './graph-large.spec.util.ts';
import { packageOf } from './graph-package.spec.util.ts';
import type { GraphEdge, GraphPackage, GraphReady } from '../../../src/bridge/common/graph-state.type.ts';
import type { GraphViewState } from '../../../src/bridge/common/graph-view-state.type.ts';
import { freshViewStateOf } from '../../../src/graph/utils/fresh-view-state.util.ts';

export const TEN_K_PACKAGE_COUNT = 10_000;

const FOLDER_COUNT = 50;

const MAX_DEPS = 3;

/** Hashes tried per package before it keeps the distinct targets found so far. */
const MAX_DRAWS = 16;

const PACKAGES_HASH = 'a10c0001';

export const tenKNameOf = (index: number): string => `pkg-${String(index).padStart(5, '0')}`;

const folderNameOf = (slot: number): string => `area-${String(slot).padStart(2, '0')}`;

/** The 50 folder keys, `area-00` to `area-49`; package `i` of `count` sits in folder `floor(i / (count / 50))`. */
export const TEN_K_FOLDERS: string[] = indexesOf(FOLDER_COUNT).map(folderNameOf);

const NO_FOLDERS: string[] = [];

/** A deterministic 32-bit hash of a package index and a draw number, so every run builds the same graph. */
const drawOf = (index: number, draw: number): number => {
  const mixed = Math.imul(index + 1, 0x9e_37_79_b1) ^ Math.imul(draw + 1, 0x85_eb_ca_77);

  return (mixed ^ (mixed >>> 15)) >>> 0;
};

/** One to three distinct earlier package indexes that package `index` needs; none for the first package. */
export const depIndexesOf = (index: number): number[] => {
  const drawn = drawOf(index, 0);
  const wanted = Math.min(index, 1 + (drawn % MAX_DEPS));
  const targets = new Set<number>();

  for (let draw = 1; draw <= MAX_DRAWS && targets.size < wanted; draw += 1) targets.add(drawOf(index, draw) % index);

  return [...targets];
};

const edgesFrom = (index: number): GraphEdge[] => {
  const source = tenKNameOf(index);
  const edgeTo = (target: number): GraphEdge => {
    const edge: GraphEdge = { source, target: tenKNameOf(target) };

    return edge;
  };

  const targets = depIndexesOf(index);

  return targets.map(edgeTo);
};

const packagesOf = (count: number): GraphPackage[] => {
  const perFolder = count / FOLDER_COUNT;
  const recordOf = (index: number): GraphPackage => {
    const name = tenKNameOf(index);
    const folder = folderNameOf(Math.floor(index / perFolder));

    return packageOf(name, `${folder}/${name}`);
  };

  return indexesOf(count).map(recordOf);
};

/** `count` packages `pkg-00000` on in 50 folders, each needing one to three earlier ones, with no cached positions. */
export const tenKPackageStateOf = (count: number, hash: string): GraphReady => {
  const indexes = indexesOf(count);
  const empty = largeState(0);
  const packages = packagesOf(count);
  const edges = indexes.flatMap(edgesFrom);
  const state: GraphReady = { ...empty, hash, packages, edges, positions: null };

  return state;
};

/** 10,000 packages in 50 folders of 200 (`area-00/pkg-00000` …), about 20,000 edges to earlier packages, uncached. */
export const tenKPackagesState = (): GraphReady => tenKPackageStateOf(TEN_K_PACKAGE_COUNT, PACKAGES_HASH);

/** A saved package view of `tenKPackagesState` with Group by folder off. */
export const tenKFlatSavedState = (): GraphViewState => {
  const fresh = freshViewStateOf(PACKAGES_HASH);
  const state: GraphViewState = { ...fresh, grouped: false };

  return state;
};

/** A saved package view of `tenKPackagesState` grouped by folder, with all 50 folders collapsed or all expanded. */
export const tenKGroupedSavedState = (isCollapsed: boolean): GraphViewState => {
  const fresh = freshViewStateOf(PACKAGES_HASH);
  const collapsed = isCollapsed ? TEN_K_FOLDERS : NO_FOLDERS;
  const state: GraphViewState = { ...fresh, grouped: true, collapsed };

  return state;
};
