import type { NodeSize } from './node-size.type.ts';
import type { GraphAtomFile, Position, Positions } from '../../bridge/common/graph-state.type.ts';

/** One group to expand: its umbrella's id and size, and its file ids in the order they fill the grid. */
export type AtomBoxSpec = {
  readonly umbrellaId: string;
  readonly umbrellaSize: NodeSize;
  readonly fileIds: string[];
};

/** The files a box draws; `hidden` is the count of free files not drawn, and 0 means no count node. */
type AtomDrawn = {
  readonly files: GraphAtomFile[];
  readonly hidden: number;
};

/** An `AtomBoxSpec` with what it draws. */
export type AtomDrawSpec = AtomBoxSpec & AtomDrawn;

/** A box's frame: its top-left corner and size. */
export type BoxBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** Every node centre (the base ids and the expanded groups' file ids), and the frame of each expanded group's box by `atom:<umbrellaId>`. */
export type AtomPositions = {
  readonly positions: Positions;
  readonly boxes: Readonly<Record<string, BoxBounds>>;
};

/** What moves as one: a plain node, or an expanded group (umbrella, files and box), tested at its `probe` centre. */
export type AtomUnit = {
  readonly ids: string[];
  readonly probe: string;
  readonly boxId: string | null;
};

/** The layout `atomPositionsOf` builds up as it applies one group after another. */
export type AtomScene = {
  readonly centres: Map<string, Position>;
  readonly boxes: Map<string, BoxBounds>;
  units: AtomUnit[];
};
