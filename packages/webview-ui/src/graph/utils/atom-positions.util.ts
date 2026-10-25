import type { Position, Positions } from '../../bridge/common/graph-state.type.ts';
import type { AtomBoxSpec, AtomPositions, AtomScene, AtomUnit, BoxBounds } from '../common/atom-layout.type.ts';
import { ATOM_BOX_PADDING_PX, ATOM_BOX_PREFIX, ATOM_FILE_SIZE, ATOM_GRID_GAP_PX } from '../common/graph-atom.const.ts';
import type { NodeSize } from '../common/node-size.type.ts';

type Edges = { readonly right: number; readonly bottom: number };

const columnsOf = (count: number): number => Math.ceil(Math.sqrt(count));

const gridSizeOf = (count: number): NodeSize => {
  const columns = columnsOf(count);
  const rows = Math.ceil(count / columns);
  const width = columns * ATOM_FILE_SIZE.width + (columns - 1) * ATOM_GRID_GAP_PX;
  const height = rows * ATOM_FILE_SIZE.height + (rows - 1) * ATOM_GRID_GAP_PX;
  const size: NodeSize = { width, height };

  return size;
};

/** The box around the umbrella and its grid: both at the padding, the umbrella left-aligned over the files. */
const boxSizeOf = (spec: AtomBoxSpec): NodeSize => {
  const { umbrellaSize, fileIds } = spec;
  const grid = gridSizeOf(fileIds.length);
  const padding = 2 * ATOM_BOX_PADDING_PX;
  const width = Math.max(umbrellaSize.width, grid.width) + padding;
  const height = umbrellaSize.height + ATOM_GRID_GAP_PX + grid.height + padding;
  const size: NodeSize = { width, height };

  return size;
};

/** The file centres, row-major in the order given, from the box's top-left corner. */
const fileCentresOf = (spec: AtomBoxSpec, topLeft: Position): [string, Position][] => {
  const columns = columnsOf(spec.fileIds.length);
  const left = topLeft.x + ATOM_BOX_PADDING_PX;
  const top = topLeft.y + ATOM_BOX_PADDING_PX + spec.umbrellaSize.height + ATOM_GRID_GAP_PX;
  const centreOf = (id: string, index: number): [string, Position] => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = left + column * (ATOM_FILE_SIZE.width + ATOM_GRID_GAP_PX) + ATOM_FILE_SIZE.width / 2;
    const y = top + row * (ATOM_FILE_SIZE.height + ATOM_GRID_GAP_PX) + ATOM_FILE_SIZE.height / 2;
    const centre: Position = { x, y };

    return [id, centre];
  };

  return spec.fileIds.map(centreOf);
};

const shiftUnit = (scene: AtomScene, unit: AtomUnit, dx: number, dy: number): void => {
  const shiftId = (id: string): void => {
    const centre = scene.centres.get(id);

    if (centre !== undefined) scene.centres.set(id, { x: centre.x + dx, y: centre.y + dy });
  };

  unit.ids.forEach(shiftId);

  if (unit.boxId === null) return;

  const box = scene.boxes.get(unit.boxId);

  if (box !== undefined) scene.boxes.set(unit.boxId, { ...box, x: box.x + dx, y: box.y + dy });
};

/** Every unit but `own` whose probe centre is right of `edges.right` moves `delta.width`, below `edges.bottom` moves `delta.height`. */
const shiftUnits = (scene: AtomScene, own: AtomUnit, edges: Edges, delta: NodeSize): void => {
  const shiftOther = (unit: AtomUnit): void => {
    const probe = scene.centres.get(unit.probe);

    if (unit === own || probe === undefined) return;

    const dx = probe.x > edges.right ? delta.width : 0;
    const dy = probe.y > edges.bottom ? delta.height : 0;

    shiftUnit(scene, unit, dx, dy);
  };

  scene.units.forEach(shiftOther);
};

/** Opens `spec`'s box at the umbrella's top-left, pushes the other units out of its way, then lays the umbrella and files in. */
const applyGroup = (scene: AtomScene, spec: AtomBoxSpec, own: AtomUnit, umbrella: Position): void => {
  const { width, height } = spec.umbrellaSize;
  const topLeft: Position = { x: umbrella.x - width / 2, y: umbrella.y - height / 2 };
  const edges: Edges = { right: umbrella.x + width / 2, bottom: umbrella.y + height / 2 };
  const box = boxSizeOf(spec);
  const delta: NodeSize = { width: box.width - width, height: box.height - height };
  const boxId = `${ATOM_BOX_PREFIX}${spec.umbrellaId}`;
  const inset: Position = {
    x: topLeft.x + ATOM_BOX_PADDING_PX + width / 2,
    y: topLeft.y + ATOM_BOX_PADDING_PX + height / 2
  };
  const bounds: BoxBounds = { ...topLeft, ...box };
  const group: AtomUnit = { ids: [spec.umbrellaId, ...spec.fileIds], probe: spec.umbrellaId, boxId };

  shiftUnits(scene, own, edges, delta);
  scene.centres.set(spec.umbrellaId, inset);

  for (const [id, centre] of fileCentresOf(spec, topLeft)) scene.centres.set(id, centre);

  scene.boxes.set(boxId, bounds);
  scene.units = scene.units.map((unit) => (unit === own ? group : unit));
};

const plainUnitOf = (id: string): AtomUnit => {
  const unit: AtomUnit = { ids: [id], probe: id, boxId: null };

  return unit;
};

type OrderedGroup = { readonly spec: AtomBoxSpec; readonly at: Position };

const byBaseOrder = (first: OrderedGroup, second: OrderedGroup): number => {
  const byY = first.at.y - second.at.y;
  const byX = first.at.x - second.at.x;
  const byId = first.spec.umbrellaId.localeCompare(second.spec.umbrellaId);

  return byY || byX || byId;
};

/** The groups to open, each with its umbrella's base centre, in the order they apply: base y, then x, then id. */
const orderedGroupsOf = (base: Positions, groups: AtomBoxSpec[], expanded: ReadonlySet<string>): OrderedGroup[] => {
  const ordered: OrderedGroup[] = [];

  for (const spec of groups) {
    const at = Object.hasOwn(base, spec.umbrellaId) ? base[spec.umbrellaId] : undefined;
    const isOpen = expanded.has(spec.umbrellaId);
    const isExpandable = isOpen && spec.fileIds.length > 0 && at !== undefined;

    if (isExpandable) ordered.push({ spec, at });
  }

  return ordered.sort(byBaseOrder);
};

const unitOf = (scene: AtomScene, id: string): AtomUnit | undefined => scene.units.find((unit) => unit.probe === id);

/**
 * Where every node sits with the `expanded` groups open. Each group's box opens at its umbrella's top-left in the layout
 * shifted so far, with the umbrella at the top and the files in a `ceil(sqrt(n))`-column grid under it; every unit whose
 * centre is right of the umbrella moves by the box's extra width, every unit below it by the extra height. A unit is a plain
 * node or a group already open (umbrella, files and box together, tested at its umbrella). The same `base` and groups give
 * the same result; an empty `expanded` gives `base`. Box frames are keyed `atom:<umbrellaId>`.
 */
export const atomPositionsOf = (base: Positions, groups: AtomBoxSpec[], expanded: ReadonlySet<string>): AtomPositions => {
  const baseEntries = Object.entries(base);
  const baseIds = Object.keys(base);
  const scene: AtomScene = { centres: new Map(baseEntries), boxes: new Map<string, BoxBounds>(), units: baseIds.map(plainUnitOf) };

  for (const { spec } of orderedGroupsOf(base, groups, expanded)) {
    const own = unitOf(scene, spec.umbrellaId);
    const umbrella = scene.centres.get(spec.umbrellaId);

    if (own !== undefined && umbrella !== undefined) applyGroup(scene, spec, own, umbrella);
  }

  const positions = Object.fromEntries(scene.centres);
  const boxes = Object.fromEntries(scene.boxes);
  const result: AtomPositions = { positions, boxes };

  return result;
};
