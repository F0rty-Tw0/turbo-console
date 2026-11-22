import type {
  ModuleBox,
  ModuleDirLeaf,
  ModuleDrawn,
  ModuleFileLeaf,
  ModuleLeaf,
  ModuleSceneView
} from '../common/module-scene.type.ts';
import type { ModuleDir, ModuleTree } from '../common/module-tree.type.ts';

/** The walk's inputs, and what it collects: boxes and leaves in pre-order, and the drawn id of each drawn file. */
type ModuleWalk = {
  readonly files: string[];
  readonly expanded: ReadonlySet<string>;
  readonly hidden: ReadonlySet<number>;
  readonly boxes: ModuleBox[];
  readonly leaves: ModuleLeaf[];
  readonly drawnOf: Map<number, string>;
};

const NO_FILES: number[] = [];

/** The indexes of the files under `dir`, nested ones included, that are not hidden. */
const liveFilesOf = (dir: ModuleDir, hidden: ReadonlySet<number>): number[] => {
  const own = dir.files.filter((index) => !hidden.has(index));
  const nested = dir.dirs.flatMap((child) => liveFilesOf(child, hidden));

  return [...own, ...nested];
};

const drawCollapsed = (dir: ModuleDir, parent: string, walk: ModuleWalk): void => {
  const under = liveFilesOf(dir, walk.hidden);

  if (under.length === 0) return;

  const id = `dir:${dir.path}`;
  const leaf: ModuleDirLeaf = { kind: 'dir', id, path: dir.path, label: `${dir.name}/`, fileCount: under.length, parent };

  walk.leaves.push(leaf);

  for (const index of under) walk.drawnOf.set(index, id);
};

const drawFile = (index: number, parent: string, walk: ModuleWalk): void => {
  const isHidden = walk.hidden.has(index);

  if (isHidden) return;

  const path = walk.files[index] ?? '';
  const id = `file:${path}`;
  const slash = path.lastIndexOf('/');
  const label = path.slice(slash + 1);
  const leaf: ModuleFileLeaf = { kind: 'file', id, path, label, parent };

  walk.leaves.push(leaf);
  walk.drawnOf.set(index, id);
};

/** Draws `dir` as a box and walks it; a box that ends up with no leaf under it is taken back, nested boxes included. */
const drawBox = (dir: ModuleDir, parent: string | null, walk: ModuleWalk): void => {
  const id = `dir:${dir.path}`;
  const box: ModuleBox = { id, path: dir.path, name: dir.name, parent };
  const at = walk.boxes.length;
  const before = walk.leaves.length;

  walk.boxes.push(box);

  for (const child of dir.dirs) {
    const isExpanded = walk.expanded.has(child.path);

    if (isExpanded) drawBox(child, id, walk);
    else drawCollapsed(child, id, walk);
  }

  for (const index of dir.files) drawFile(index, id, walk);

  if (walk.leaves.length === before) walk.boxes.splice(at);
};

/**
 * The tree walked pre-order from the root box, child folders before files: an expanded folder is a box, a collapsed one a
 * leaf for every file under it. `tests` are left out unless `view.shown.tests`; a folder with no file left is dropped.
 */
export const moduleDrawnOf = (tree: ModuleTree, tests: number[], view: ModuleSceneView): ModuleDrawn => {
  const hiddenTests = view.shown.tests ? NO_FILES : tests;
  const walk: ModuleWalk = {
    files: tree.files,
    expanded: new Set(view.expanded),
    hidden: new Set(hiddenTests),
    boxes: [],
    leaves: [],
    drawnOf: new Map()
  };

  drawBox(tree.root, null, walk);

  const drawn: ModuleDrawn = { boxes: walk.boxes, leaves: walk.leaves, drawnOf: walk.drawnOf };

  return drawn;
};
