import type { Viewport } from './graph-page.type.ts';
import type { AtomCanvas } from './task-canvas.type.ts';
import type { GraphAtomCounts } from '../../bridge/common/graph-atoms-message.type.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';

/** Where an umbrella sits on the canvas, in model units: its centre and its body's width. */
export type AtomChipBox = {
  readonly centre: Position;
  readonly width: number;
};

/** The widgets layer the chip rows go in, and the builder of an umbrella's row from its counts. */
export type AtomChipsPort = {
  readonly layer: HTMLElement;
  readonly rowOf: (counts: GraphAtomCounts) => HTMLElement;
};

/** The canvas a chip row is placed over: each umbrella's box, and the camera that maps it to the screen. */
export type AtomChipsView = {
  readonly atoms: Pick<AtomCanvas, 'boxOf'>;
  readonly viewport: () => Viewport;
};

/** What `AtomChips` builds rows with and places them by. */
export type AtomChipsDeps = {
  readonly port: AtomChipsPort;
  readonly view: AtomChipsView;
};

/** An umbrella's chip row: the element, the counts text it was built for, and the transform and width last written to it. */
export type AtomChipRow = {
  readonly element: HTMLElement;
  readonly text: string;
  readonly transform: string;
  readonly width: string;
};
