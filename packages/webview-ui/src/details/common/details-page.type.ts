import type { RunView } from '../../bridge/common/details-state.type.ts';

export type RunButtonFactory = (run: RunView) => HTMLButtonElement;

/** The parts of a task card that `patchRun` replaces, and how to build its Run/Stop button. */
export type CardRefs = {
  readonly status: HTMLElement;
  readonly runSlot: HTMLElement;
  readonly runButton: RunButtonFactory;
};

/** Cards by task id, built by `render`; `patchRun` looks a card up here, never through a selector. */
export type CardIndex = ReadonlyMap<string, CardRefs>;

export type RenderedCard = {
  readonly element: HTMLElement;
  readonly refs: CardRefs;
};

export type FieldRow = readonly [term: string, value: string];
