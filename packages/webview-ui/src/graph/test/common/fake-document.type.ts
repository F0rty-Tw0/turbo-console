/** What a fake listener reads of an event: its type, and whatever the spec set on it (`key`, `target`). */
export type FakeEvent = { readonly type: string };

export type FakeListener = (event: FakeEvent) => void;

export type AddedListener = {
  readonly type: string;
  readonly listener: FakeListener;
};

/** What `getBoundingClientRect` answers: the offset box, as if no ancestor were scrolled or offset. */
export type FakeRect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/** The element a fake `classList` reads and writes: its space-separated `className`. */
export type ClassHolder = {
  // eslint-disable-next-line local/readonly-type-properties -- the fake classList writes the element's className
  className: string;
};

/** The `classList` calls the graph's element builders and specs make. */
export type FakeClassList = {
  readonly add: (...names: string[]) => void;
  readonly remove: (...names: string[]) => void;
  readonly toggle: (name: string, force: boolean) => void;
  readonly contains: (name: string) => boolean;
};
