import type { Page } from '@playwright/test';

import { freeSpotsOf } from './graph-geometry.spec.util.ts';
import { readEdgeLines } from './graph-lines.spec.util.ts';
import type { ElementRect, GrabSearch, ViewportPoint } from '../../common/playwright.type.ts';

/**
 * Runs in the page through `evaluate`, so it reads only its argument: what lies on top at `point` when that is not a
 * canvas (`TAG#id`, `nothing` when no element is there), and `null` when a canvas is. The flow overlay is a canvas too,
 * but it lets clicks through, so it never answers.
 */
const readGrabBlocker = (point: ViewportPoint): string | null => {
  const top = document.elementFromPoint(point.x, point.y);

  if (top instanceof HTMLCanvasElement) return null;

  if (top === null) return 'nothing';

  return `${top.tagName}#${top.id}`;
};

/** Fails at once, naming what is in the way, when no canvas is the top element at `grab`, so a drag cannot miss the graph and time out later. */
export const expectGrabbable = async (page: Page, grab: ViewportPoint): Promise<void> => {
  const blocker = await page.evaluate(readGrabBlocker, grab);

  if (blocker !== null)
    throw new Error(`graph e2e: ${blocker} covers the grab point (${grab.x}, ${grab.y}), so a drag would miss the graph canvas`);
};

/**
 * Runs in the page through `evaluate`, so it reads only its argument: the first spot with a canvas on top both there and
 * `travel` px right and down of it, where the content under the spot lies once a drag has carried the camera that far,
 * so the drag back grabs the canvas too; `null` when no spot has.
 */
const readFirstGrabbable = (search: GrabSearch): ViewportPoint | null => {
  const isCanvasAt = (x: number, y: number): boolean => document.elementFromPoint(x, y) instanceof HTMLCanvasElement;
  const isGrabbable = (spot: ViewportPoint): boolean => {
    const isStartFree = isCanvasAt(spot.x, spot.y);
    const isEndFree = isCanvasAt(spot.x + search.travel, spot.y + search.travel);

    return isStartFree && isEndFree;
  };

  return search.spots.find(isGrabbable) ?? null;
};

/**
 * The first of `spots` where a press grabs the graph canvas, not a panel or widget over it, both there and `travel` px
 * right and down of it; throws when none does.
 */
export const grabbableSpotOn = async (page: Page, spots: ViewportPoint[], travel: number): Promise<ViewportPoint> => {
  const search: GrabSearch = { spots, travel };
  const spot = await page.evaluate(readFirstGrabbable, search);

  if (spot === null)
    throw new Error(
      `graph e2e: none of ${spots.length} spots has the graph canvas on top there and ${travel} px right and down of it`
    );

  return spot;
};

/** The first of `freeSpotsOf` the container, the boxes and the drawn lines that `grabbableSpotOn` accepts for `travel`; throws when none does. */
export const freeGrabbableSpotOn = async (
  page: Page,
  container: ElementRect,
  boxes: ElementRect[],
  travel: number
): Promise<ViewportPoint> => {
  const lines = await readEdgeLines(page);
  const spots = freeSpotsOf(container, boxes, lines);

  return grabbableSpotOn(page, spots, travel);
};
