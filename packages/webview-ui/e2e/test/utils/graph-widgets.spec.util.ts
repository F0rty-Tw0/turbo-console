import type { Locator } from '@playwright/test';

import { readRect } from './element-rect.spec.util.ts';
import { nodeBoxOf } from './graph-geometry.spec.util.ts';
import type { ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import { folderTitleOf } from '../../../src/graph/utils/controls-text.util.ts';
import type { ElementRect } from '../../common/playwright.type.ts';

/** How far a widget may sit from where the layer should put it, in CSS pixels. */
const PLACE_TOLERANCE_PX = 1;

/** How far a widget button sits in from its box's or collapsed node's left and right edges. */
const INSET_PX = 8;

/** Half the 24 px package "…". */
const HALF_BUTTON_PX = 12;

/** The selected node's border in model px (`graph-style.ts`), drawn centred on the node's edge. */
const SELECTED_BORDER_PX = 3;

/** The fault of one edge more than a pixel from where it should be; none when it is within a pixel. */
export const offFaultsOf = (edge: string, actual: number, expected: number): string[] => {
  const distance = Math.abs(actual - expected);
  const isOff = distance > PLACE_TOLERANCE_PX;

  if (!isOff) return [];

  return [`${edge} is at ${actual.toFixed(1)}, expected ${expected.toFixed(1)}`];
};

/** Each edge of `actual` more than a pixel from the same edge of `expected`. */
export const rectFaultsOf = (what: string, actual: ElementRect, expected: ElementRect): string[] => {
  const left = offFaultsOf(`${what} left`, actual.left, expected.left);
  const top = offFaultsOf(`${what} top`, actual.top, expected.top);
  const width = offFaultsOf(`${what} width`, actual.width, expected.width);
  const height = offFaultsOf(`${what} height`, actual.height, expected.height);

  return [...left, ...top, ...width, ...height];
};

/** Runs in the page through `evaluate`: the element's next sibling carries `className`. */
export const isNextSiblingOf = (element: Element, className: string): boolean => {
  const next = element.nextElementSibling;

  return next?.classList.contains(className) ?? false;
};

/** The accessible name of a folder's "…". */
export const ellipsisNameOf = (folder: string): string => `Actions for folder ${folderTitleOf(folder)}`;

const NO_RECT: ElementRect = { left: Number.NaN, top: Number.NaN, width: Number.NaN, height: Number.NaN };

/** A button's page rect; NaN edges while it has no box, so every placement check fails. */
export const rectOf = async (button: Locator): Promise<ElementRect> => {
  const box = await button.boundingBox();

  if (box === null) return NO_RECT;

  const rect: ElementRect = { left: box.x, top: box.y, width: box.width, height: box.height };

  return rect;
};

/** The chevron's left edge sits 8 px in from the box's, its top `topPx` below the box's. */
export const chevronFaultsOf = (box: ElementRect, chevron: ElementRect, topPx: number): string[] => {
  const left = offFaultsOf('chevron left', chevron.left, box.left + INSET_PX);
  const top = offFaultsOf('chevron top', chevron.top, box.top + topPx);

  return [...left, ...top];
};

/** The "…" ends 8 px in from the box's right edge, its top `topPx` below the box's. */
export const ellipsisFaultsOf = (box: ElementRect, ellipsis: ElementRect, topPx: number): string[] => {
  const right = offFaultsOf('"…" right', ellipsis.left + ellipsis.width, box.left + box.width - INSET_PX);
  const top = offFaultsOf('"…" top', ellipsis.top, box.top + topPx);

  return [...right, ...top];
};

/** The package "…" is centred on the node's drawn top-right corner, which the selected border puts half its width outside the node. */
export const cornerFaultsOf = (node: ElementRect, button: ElementRect, zoom: number): string[] => {
  const border = (SELECTED_BORDER_PX / 2) * zoom;
  const x = offFaultsOf('"…" centre x', button.left + HALF_BUTTON_PX, node.left + node.width + border);
  const y = offFaultsOf('"…" centre y', button.top + HALF_BUTTON_PX, node.top - border);

  return [...x, ...y];
};

/** The drawn rect of the node `name` in page px; throws when it is not drawn. */
export const nodeRectNamed = (nodes: ProbeNode[], zoom: number, name: string): ElementRect => {
  const node = nodes.find((candidate): boolean => candidate.id === name);

  if (node === undefined) throw new Error(`graph e2e: no node '${name}' is drawn`);

  return nodeBoxOf(node, zoom);
};

/** Each edge of the layer more than a pixel from the same edge of the container. */
export const layerFaultsOf = async (layer: Locator, container: Locator): Promise<string[]> => {
  const containerRect = await container.evaluate(readRect);
  const layerRect = await layer.evaluate(readRect);

  return rectFaultsOf('layer', layerRect, containerRect);
};
