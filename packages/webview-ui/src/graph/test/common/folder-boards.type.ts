/** A laid-out ELK node's rect in its parent's coordinates. */
export type ElkRect = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

/** What `sceneOf` takes besides the fixture: each part defaults to every package (`visible`) or none. */
export type SceneParts = {
  readonly collapsed?: string[];
  readonly visible?: string[];
  readonly ghosts?: string[];
};
