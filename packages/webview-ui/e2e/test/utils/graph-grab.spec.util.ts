import type { Page } from '@playwright/test';

import type { ViewportPoint } from '../../common/playwright.type.ts';

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
