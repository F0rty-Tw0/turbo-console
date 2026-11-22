/** Which kinds of modules and imports the scene draws. */
export type ModuleShown = {
  readonly types: boolean;
  readonly tests: boolean;
  readonly lazies: boolean;
};

/** `expanded` lists folder paths; the root is always expanded and never listed. */
export type ModuleSceneView = {
  readonly expanded: string[];
  readonly shown: ModuleShown;
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

/** What the module view draws;`leafCount` counts leaves only, so expanded boxes are not counted (D10). */
export type ModuleScene = {
  readonly boxes: ModuleBox[];
  readonly leaves: ModuleLeaf[];
  readonly links: ModuleSceneLink[];
  readonly leafCount: number;
};
