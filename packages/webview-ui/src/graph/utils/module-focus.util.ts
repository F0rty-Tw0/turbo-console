import { endOf } from './module-end.util.ts';
import type { ModuleLink, ModulesFound } from '../../bridge/common/graph-modules.type.ts';
import type { ModulesShown } from '../../bridge/common/graph-view-state.type.ts';
import type { ModuleFocus, ModuleFocusSet } from '../common/module-scene.type.ts';

/** Each node's neighbours over the shown links, both ways; a file is its index, a stub `files.length` plus its index. */
type FocusLinks = Map<number, number[]>;

/** The node `target` names: a file's index, a stub's `files.length` plus its index; `null` when the payload lacks it. */
const nodeOf = (found: ModulesFound, target: string): number | null => {
  const end = endOf(target);

  if (end.kind === 'dir') return null;

  if (end.kind === 'file') {
    const fileAt = found.files.indexOf(end.path);

    return fileAt === -1 ? null : fileAt;
  }

  const stubAt = found.stubs.indexOf(end.name);
  const node = found.files.length + stubAt;

  return stubAt === -1 ? null : node;
};

/** The link's import count with the kinds `shown` leaves out read as 0. */
const shownCountOf = (link: ModuleLink, shown: ModulesShown): number => {
  const [, , statics, types, lazies] = link;
  const shownTypes = shown.types ? types : 0;
  const shownLazies = shown.lazies ? lazies : 0;

  return statics + shownTypes + shownLazies;
};

const join = (links: FocusLinks, from: number, to: number): void => {
  const near = links.get(from) ?? [];

  near.push(to);
  links.set(from, near);
};

/** Every link with an import shown, file links then stub links (`to` offset past the files), joined both ways. */
const focusLinksOf = (found: ModulesFound, shown: ModulesShown): FocusLinks => {
  const links: FocusLinks = new Map();
  const stubOffset = found.files.length;
  const joinShown = (link: ModuleLink, offset: number): void => {
    const [from, to] = link;
    const count = shownCountOf(link, shown);

    if (count === 0) return;

    join(links, from, offset + to);
    join(links, offset + to, from);
  };

  for (const link of found.fileLinks) joinShown(link, 0);

  for (const link of found.stubLinks) joinShown(link, stubOffset);

  return links;
};

/** The nodes one hop past `frontier` that `isNode` keeps and `reached` lacks; each is added to `reached`. */
const stepOf = (frontier: number[], links: FocusLinks, reached: Set<number>, isNode: (node: number) => boolean): number[] => {
  const next: number[] = [];

  for (const node of frontier) {
    const near = links.get(node) ?? [];

    for (const other of near) {
      const isReached = reached.has(other);
      const isKept = isNode(other);

      if (isReached || !isKept) continue;

      reached.add(other);
      next.push(other);
    }
  }

  return next;
};

/**
 * The focus set (spec §6.7): every node up to `focus.depth` hops from the target, walked breadth-first over the shown
 * file and stub links in both directions, through stubs like any node. A test file is a node only while `shown.tests`
 * holds, the target always; a target the payload does not hold gives two empty sets.
 */
export const focusSetOf = (found: ModulesFound, shown: ModulesShown, focus: ModuleFocus): ModuleFocusSet => {
  const start = nodeOf(found, focus.target);

  if (start === null) {
    const none: ModuleFocusSet = { files: new Set(), stubs: new Set() };

    return none;
  }

  const fileCount = found.files.length;
  const tests = new Set(found.tests);
  const isNode = (node: number): boolean => shown.tests || !tests.has(node);
  const links = focusLinksOf(found, shown);
  const reached = new Set([start]);
  let frontier = [start];

  for (let hop = 0; hop < focus.depth; hop += 1) frontier = stepOf(frontier, links, reached, isNode);

  const nodes = [...reached];
  const fileIndexes = nodes.filter((node) => node < fileCount);
  const isStubReachedAt = (_: string, index: number): boolean => reached.has(fileCount + index);
  const stubNames = found.stubs.filter(isStubReachedAt);
  const set: ModuleFocusSet = { files: new Set(fileIndexes), stubs: new Set(stubNames) };

  return set;
};
