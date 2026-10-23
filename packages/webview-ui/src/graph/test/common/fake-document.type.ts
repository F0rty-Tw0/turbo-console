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
