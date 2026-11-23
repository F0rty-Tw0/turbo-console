import type { NodeSize } from './node-size.type.ts';

/** Which kinds of modules and imports the scene draws. */
export type ModuleShown = {
  readonly types: boolean;
  readonly tests: boolean;
  readonly lazies: boolean;
};

/** A focus target, a `'file:'` or `'pkg:'` id, and how many link hops from it the focus reaches. */
export type ModuleFocus = {
  readonly target: string;
  readonly depth: number;
};

/** What a focus keeps: file indexes into `found.files` and stub names from `found.stubs`. */
export type ModuleFocusSet = {
  readonly files: Set<number>;
  readonly stubs: Set<string>;
};

/**
 * `expanded` lists folder paths; the root is always expanded and never listed. With a `focus`, the scene draws only the
 * focus set, with every ancestor folder of its files open as well.
 */
export type ModuleSceneView = {
  readonly expanded: string[];
  readonly shown: ModuleShown;
  readonly focus: ModuleFocus | null;
};

/** An expanded folder drawn as a compound; the root box is id 'dir:' with path '' and name ''. */
export type ModuleBox = {
  readonly id: string;
  readonly path: string;
  readonly name: string;
  readonly parent: string | null;
};

/** A file whose folders are all expanded, labelled with its basename. */
export type ModuleFileLeaf = {
  readonly kind: 'file';
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly parent: string;
};

/** A collapsed folder drawn as one card for every file under it, labelled `<name>/`. */
export type ModuleDirLeaf = {
  readonly kind: 'dir';
  readonly id: string;
  readonly path: string;
  readonly label: string;
  readonly fileCount: number;
  readonly parent: string;
};

/** Another workspace package a drawn link imports, drawn at the root and labelled with its name. */
export type ModuleStubLeaf = {
  readonly kind: 'stub';
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly parent: null;
};

export type ModuleLeaf = ModuleFileLeaf | ModuleDirLeaf | ModuleStubLeaf;

/** The imports between two drawn ends, merged and counted per kind. */
export type ModuleSceneLink = {
  readonly source: string;
  readonly target: string;
  readonly statics: number;
  readonly types: number;
  readonly lazies: number;
};

/** The tree walk's output: boxes and leaves in pre-order, and the drawn id (its own or its collapsed folder's) per drawn file index. */
export type ModuleDrawn = {
  readonly boxes: ModuleBox[];
  readonly leaves: ModuleLeaf[];
  readonly drawnOf: ReadonlyMap<number, string>;
};

/**
 * What the module view draws; `leafCount` counts leaves only, so expanded boxes are not counted (D10). `fileIds` are the
 * `file:` ids of every file the view includes, drawn as a card or folded into a folder card, so a hidden test is not one.
 */
export type ModuleScene = {
  readonly boxes: ModuleBox[];
  readonly leaves: ModuleLeaf[];
  readonly links: ModuleSceneLink[];
  readonly leafCount: number;
  readonly fileIds: string[];
};

/** How the page sizes module nodes: each leaf's card, and each box's title width in px (no padding). */
export type ModuleMeasures = {
  readonly sizeOf: (leaf: ModuleLeaf) => NodeSize;
  readonly titleWidthOf: (box: ModuleBox) => number;
};
