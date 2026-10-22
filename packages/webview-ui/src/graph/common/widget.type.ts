/** A rectangle in container px, as Cytoscape's `renderedBoundingBox`. */
export type RectPx = {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

export type Point = {
  readonly x: number;
  readonly y: number;
};

export type Size = {
  readonly width: number;
  readonly height: number;
};

export type RowKind = 'box' | 'collapsed';

/** A header row's left edge, top edge and width; the row is `WIDGET_BUTTON_PX` high. */
export type RowPlacement = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
};

/** The widget layer's size and, when the details panel overlays the canvas, the container x where it starts. */
export type LayerBounds = {
  readonly width: number;
  readonly height: number;
  readonly overlayLeft: number | null;
};

export type ShowFolderState = {
  readonly checked: 'true' | 'false' | 'mixed';
  readonly isDisabled: boolean;
};

export type RowButtonRects = {
  readonly chevron: RectPx;
  readonly ellipsis: RectPx;
};
