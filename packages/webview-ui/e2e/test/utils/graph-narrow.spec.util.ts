import type { Page } from '@playwright/test';

import type { ProbeNode } from '../../../src/graph/common/graph-probe.type.ts';
import type { AnchorBox } from '../../../src/graph/common/keep-clear.type.ts';

/** The margin the keep-clear pan leaves between a node and the overlay, less one pixel of rounding. */
const CLEAR_MARGIN_PX = 15;

/** Resizes the page to `px` wide, keeping its height. */
export const setViewportWidth = async (page: Page, px: number): Promise<void> => {
  const height = page.viewportSize()?.height ?? 0;

  await page.setViewportSize({ width: px, height });
};

/** The horizontal span of the named nodes' rendered boxes at `zoom`; names the probe does not list are left out. */
export const anchorBoxOf = (nodes: ProbeNode[], names: string[], zoom: number): AnchorBox => {
  const anchors = nodes.filter((node): boolean => names.includes(node.id));
  const lefts = anchors.map((node): number => node.renderedX - (node.width * zoom) / 2);
  const rights = anchors.map((node): number => node.renderedX + (node.width * zoom) / 2);
  const box: AnchorBox = { x1: Math.min(...lefts), x2: Math.max(...rights) };

  return box;
};

/** The box ends at least the keep-clear margin (less a pixel) left of an overlay that starts at `overlayLeft`. */
export const isClearOf = (box: AnchorBox, overlayLeft: number): boolean => box.x2 <= overlayLeft - CLEAR_MARGIN_PX;
