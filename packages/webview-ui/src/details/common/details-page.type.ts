import type { Bridge } from '../../bridge/common/bridge.type.ts';
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

/**
 * Focusable controls by focus key (`run:<taskId>`, `copy:<taskId>`, `refresh`, `open`, `retry-<scope>`), built by
 * `render`. A re-render finds the focused control here by identity, never through a selector or a dataset key.
 */
export type FocusTargets = Map<string, HTMLElement>;

/** What every part of the page is built with: the bridge it posts through and the focus targets it registers in. */
export type RenderContext = {
  readonly bridge: Bridge;
  readonly focusTargets: FocusTargets;
};

export type RenderedPage = {
  readonly cards: CardIndex;
  readonly focusTargets: FocusTargets;
};

export type FieldRow = readonly [term: string, value: string];
