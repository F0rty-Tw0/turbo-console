import type { Core, SingularElementArgument } from 'cytoscape';

import { BOARDS_NAMES, boardsSceneOf } from './folder-boards.spec.util.ts';
import { styleTextOf } from './folder-boxes.spec.util.ts';
import type { Position, Positions } from '../../../bridge/common/graph-state.type.ts';
import type { ElementSnapshot, FolderStep } from '../common/folder-history.type.ts';
import { BOARDS_POSITIONS_STUB } from '../stubs/folder-boards.stub.ts';

type Random = () => number;

const MODULUS = 2147483647;

const MULTIPLIER = 48271;

const MOVE_CHANCE = 0.1;

const COLLAPSE_CHANCE = 0.5;

const SHOW_CHANCE = 0.4;

const GHOST_CHANCE = 0.3;

const SPAN = 400;

const boardsFolders = boardsSceneOf([]).members.keys();

const BOARDS_FOLDERS: string[] = [...boardsFolders];

/** A Park-Miller generator: numbers in [0, 1), the same for the same seed in [1, 2147483646]. */
const seededRandomOf = (seed: number): Random => {
  let state = seed;
  const next = (): number => {
    state = (state * MULTIPLIER) % MODULUS;

    return (state - 1) / (MODULUS - 1);
  };

  return next;
};

const someOf = (names: string[], random: Random, chance: number): string[] => names.filter((): boolean => random() < chance);

const randomPositionOf = (random: Random): Position => {
  const x = Math.round(random() * SPAN);
  const y = Math.round(random() * SPAN);
  const position: Position = { x, y };

  return position;
};

const movedOf = (positions: Positions, random: Random): Positions => {
  const moved = someOf(BOARDS_NAMES, random, MOVE_CHANCE);
  const entries = moved.map((name: string): [string, Position] => [name, randomPositionOf(random)]);
  const moves = Object.fromEntries(entries);
  const next: Positions = { ...positions, ...moves };

  return next;
};

const stepOf = (positions: Positions, random: Random): FolderStep => {
  const collapsed = someOf(BOARDS_FOLDERS, random, COLLAPSE_CHANCE);
  const visible = someOf(BOARDS_NAMES, random, SHOW_CHANCE);
  const isHidden = (name: string): boolean => !visible.includes(name);
  const hidden = BOARDS_NAMES.filter(isHidden);
  const ghosts = someOf(hidden, random, GHOST_CHANCE);
  const step: FolderStep = { positions, collapsed, visible, ghosts };

  return step;
};

/** `count` random steps over the boards fixture from `seed`: each moves some packages, then picks what to show, ghost and collapse. */
export const folderStepsOf = (seed: number, count: number): FolderStep[] => {
  const random = seededRandomOf(seed);
  const steps: FolderStep[] = [];
  let positions: Positions = BOARDS_POSITIONS_STUB;

  for (let index = 0; index < count; index += 1) {
    positions = movedOf(positions, random);
    steps.push(stepOf(positions, random));
  }

  return steps;
};

const leafPositionOf = (element: SingularElementArgument): Position | null => {
  const isLeaf = element.is('node:childless');

  if (!isLeaf) return null;

  const node = element.cy().getElementById(element.id());
  const { x, y } = node.position();
  const position: Position = { x, y };

  return position;
};

const snapshotOf = (element: SingularElementArgument): ElementSnapshot => {
  const id = element.id();
  const classes = element.classes().toSorted();
  const position = leafPositionOf(element);
  const label: unknown = element.data('label');
  const count: unknown = element.data('count');
  const isVisible = element.visible();
  const display = styleTextOf(element.cy(), id, 'display');
  const snapshot: ElementSnapshot = { id, classes, position, label, count, isVisible, display };

  return snapshot;
};

const byId = (first: ElementSnapshot, second: ElementSnapshot): number => first.id.localeCompare(second.id);

/** A snapshot of every element of `cy` by id, blind to draw order, which follows the toggle history by design. */
export const elementSnapshotsOf = (cy: Core): ElementSnapshot[] => {
  const snapshots = cy.elements().map(snapshotOf);

  return snapshots.toSorted(byId);
};
