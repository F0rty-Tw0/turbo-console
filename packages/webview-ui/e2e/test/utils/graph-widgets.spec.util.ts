import type { Locator } from '@playwright/test';

import { isInside, readRect } from './element-rect.spec.util.ts';
import { nodeBoxOf } from './graph-geometry.spec.util.ts';
import type { ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import { folderTitleOf } from '../../../src/graph/utils/controls-text.util.ts';
import { WIDGET_BUTTON_PX, WIDGET_INSET_PX } from '../../common/graph.const.ts';
import type { ElementRect } from '../../common/playwright.type.ts';

/** How far a widget may sit from where the layer should put it, in CSS pixels. */
const PLACE_TOLERANCE_PX = 1;

/** Half the 24 px package "…". */
const HALF_BUTTON_PX = WIDGET_BUTTON_PX / 2;

/** The selected node's border in model px (`graph-style.ts`), drawn centred on the node's edge. */
const SELECTED_BORDER_PX = 3;

/** The height of a box's header band: its top 32 px. */
const BAND_PX = 32;

/** How far a menu may reach past the area it should lie in, in CSS pixels. */
const MENU_TOLERANCE_PX = 0.5;

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
  const left = offFaultsOf('chevron left', chevron.left, box.left + WIDGET_INSET_PX);
  const top = offFaultsOf('chevron top', chevron.top, box.top + topPx);

  return [...left, ...top];
};

/** The "…" ends 8 px in from the box's right edge, its top `topPx` below the box's. */
export const ellipsisFaultsOf = (box: ElementRect, ellipsis: ElementRect, topPx: number): string[] => {
  const right = offFaultsOf('"…" right', ellipsis.left + ellipsis.width, box.left + box.width - WIDGET_INSET_PX);
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

/** Runs in the page through `evaluate`: the text is cut off by its own width. */
export const isCutText = (element: Element): boolean => element.scrollWidth > element.clientWidth;

const faultIf = (isFault: boolean, text: string): string[] => {
  if (!isFault) return [];

  return [text];
};

/** The title lies inside its row, and the row's top lies in the box's top 32 px band. */
export const titleFaultsOf = (title: ElementRect, row: ElementRect, box: ElementRect): string[] => {
  const rowOffset = row.top - box.top;
  const isRowInBand = rowOffset >= 0 && rowOffset < BAND_PX;
  const outsideRow = faultIf(!isInside(title, row), 'title is not inside its row');
  const outsideBand = faultIf(!isRowInBand, `row top is ${rowOffset.toFixed(1)} px below the box top, outside its ${BAND_PX} px band`);

  return [...outsideRow, ...outsideBand];
};

/** What the menu reaches past: the container's left, top and bottom, and the right edge of the area no overlay covers. */
export const menuFaultsOf = (menu: ElementRect, container: ElementRect, areaRight: number): string[] => {
  const menuRight = menu.left + menu.width;
  const menuBottom = menu.top + menu.height;
  const containerBottom = container.top + container.height;
  const left = faultIf(menu.left < container.left - MENU_TOLERANCE_PX, 'menu left is past the container');
  const top = faultIf(menu.top < container.top - MENU_TOLERANCE_PX, 'menu top is past the container');
  const bottom = faultIf(menuBottom > containerBottom + MENU_TOLERANCE_PX, 'menu bottom is past the container');
  const right = faultIf(menuRight > areaRight + MENU_TOLERANCE_PX, `menu right is past ${areaRight.toFixed(1)}`);

  return [...left, ...top, ...bottom, ...right];
};

/** Runs in the page through `evaluate`: sets each theme variable on the root as VS Code does; `null` removes it. */
export const setRootVars = (vars: Record<string, string | null>): void => {
  const root = document.documentElement.style;

  for (const [name, value] of Object.entries(vars)) {
    if (value === null) root.removeProperty(name);
    else root.setProperty(name, value);
  }
};

/** Runs in the page through `evaluate`: the element's scroll offsets, left then top. */
export const scrollOf = (element: Element): number[] => [element.scrollLeft, element.scrollTop];
