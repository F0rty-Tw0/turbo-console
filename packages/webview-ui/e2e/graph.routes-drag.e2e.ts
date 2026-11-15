import { expect } from '@playwright/test';

import type { ViewportPoint } from './common/playwright.type.ts';
import { test } from './graph-routes.fixture.ts';
import { U0_STATE_STUB } from './test/stubs/graph-u0.stub.ts';
import { expectGrabbable, grabbableSpotOn } from './test/utils/graph-grab.spec.util.ts';
import { FLAT_SAVED, GROUPED_SAVED, REST_EDGE_IDS, UI } from './test/utils/graph-u0-routes.spec.util.ts';

const U0 = U0_STATE_STUB;

/** Runs in the page through `evaluate`: 8 px above the bottom-centre of `element`. */
const bottomCentreOf = (element: Element): ViewportPoint => {
  const rect = element.getBoundingClientRect();

  const point = { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height - 8) };

  return point;
};

/** Runs in the page through `evaluate`: 10 px left of the left edge of `element`, halfway down it. */
const leftOfMiddleOf = (element: Element): ViewportPoint => {
  const rect = element.getBoundingClientRect();

  const point = { x: Math.round(rect.x - 10), y: Math.round(rect.y + rect.height / 2) };

  return point;
};

/** The drag travel the spot searches allow for; it carries a spot 10 px left of the aside onto it. */
const TRAVEL = 20;

/** Runs in the page through `evaluate`: puts a 10 px square element over `point`, as a widget over the canvas would be. */
const coverPoint = (point: ViewportPoint): void => {
  const cover = document.createElement('div');

  cover.id = 'grab-cover';
  cover.style.setProperty('position', 'fixed');
  cover.style.setProperty('left', `${point.x - 5}px`);
  cover.style.setProperty('top', `${point.y - 5}px`);
  cover.style.setProperty('width', '10px');
  cover.style.setProperty('height', '10px');
  document.body.append(cover);
};

/** Runs in the page through `evaluate`: the id of the top element at `point`. */
const idAt = (point: ViewportPoint): string | undefined => document.elementFromPoint(point.x, point.y)?.id;

test.describe('FEATURE: a drag drops the routes of only the edges it moved', () => {
  test('GIVEN the U0 workspace laid out flat, dragging @company/ui drops its 6 routes from the post, and a reopen serves that cache (b5)', async ({
    graphCanvas,
    graphHost,
    graphPage,
    graphProbe,
    graphRoutes
  }): Promise<void> => {
    await test.step('WHEN the page is opened and the U0 state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: FLAT_SAVED });
      await graphHost.sendState(U0);
    });

    await test.step('AND ELK has laid it out', async (): Promise<void> => graphProbe.expectLayoutEngine('elk'));

    await test.step('AND @company/ui is dragged by 40 px right and 30 px down', async (): Promise<void> =>
      graphCanvas.dragNode(UI, 40, 30));

    await test.step('THEN the posted routes lack its 6 edges', async (): Promise<void> =>
      graphRoutes.expectPostedRouteIds(REST_EDGE_IDS));

    await test.step('WHEN the page is reopened with that post cached', async (): Promise<void> => {
      await graphRoutes.reopenWithPostedFlatCached(U0);
      await graphProbe.expectLayoutEngine('cache');
    });
  });
});

test.describe('FEATURE: a drag never starts off the graph canvas', () => {
  test('GIVEN the Details aside open over the grouped U0 view, a grab point under the aside fails naming ASIDE#graph-details', async ({
    graphDetails,
    graphHost,
    graphPage,
    page
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped, the U0 state is sent and the Details aside is open', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
      await graphDetails.expectOpen(true);
    });

    const aside =
      await test.step('AND a point 8 px above the aside bottom-centre is on the aside', async (): Promise<ViewportPoint> => {
        const point = await page.locator('#graph-details').evaluate(bottomCentreOf);
        const topId = await page.evaluate(idAt, point);

        expect(topId).toBe('graph-details');

        return point;
      });

    await test.step('THEN checking that point fails naming the aside', async (): Promise<void> => {
      const message = `graph e2e: ASIDE#graph-details covers the grab point (${aside.x}, ${aside.y}), so a drag would miss the graph canvas`;

      await expect(expectGrabbable(page, aside)).rejects.toThrow(message);
    });
  });

  test('GIVEN the Details aside open over the grouped U0 view, an empty canvas spot is grabbable', async ({
    graphDetails,
    graphGrouping,
    graphHost,
    graphPage,
    page
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped, the U0 state is sent and the Details aside is open', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
      await graphDetails.expectOpen(true);
    });

    await test.step('THEN an empty canvas spot passes the grab check', async (): Promise<void> => {
      const spot = await graphGrouping.freeSpot();

      await expectGrabbable(page, spot);
    });
  });

  test('GIVEN a 10 px element over the first free spot of the grouped U0 view, the free spot search skips that spot', async ({
    graphGrouping,
    graphHost,
    graphPage,
    page
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped and the U0 state is sent', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
    });

    const first = await test.step('AND a 10 px element covers the first free spot', async (): Promise<ViewportPoint> => {
      const spot = await graphGrouping.freeSpot(TRAVEL);

      await page.evaluate(coverPoint, spot);

      const topId = await page.evaluate(idAt, spot);

      expect(topId).toBe('grab-cover');

      return spot;
    });

    await test.step('THEN the free spot search returns another spot, where the canvas is on top', async (): Promise<void> => {
      const spot = await graphGrouping.freeSpot(TRAVEL);

      expect(spot).not.toEqual(first);
      await expectGrabbable(page, spot);
    });
  });

  test('GIVEN the Details aside open over the grouped U0 view, the grabbable spot search skips a spot a 20 px drag carries onto the aside', async ({
    graphDetails,
    graphGrouping,
    graphHost,
    graphPage,
    page
  }): Promise<void> => {
    await test.step('WHEN the page is opened grouped, the U0 state is sent and the Details aside is open', async (): Promise<void> => {
      await graphPage.open({ savedState: GROUPED_SAVED });
      await graphHost.sendState(U0);
      await graphDetails.expectOpen(true);
    });

    const near =
      await test.step('AND a spot 10 px left of the aside has the canvas on top, but 20 px right and down of it is the aside', async (): Promise<ViewportPoint> => {
        const point = await page.locator('#graph-details').evaluate(leftOfMiddleOf);
        const end: ViewportPoint = { x: point.x + TRAVEL, y: point.y + TRAVEL };
        const endId = await page.evaluate(idAt, end);

        await expectGrabbable(page, point);
        expect(endId).toBe('graph-details');

        return point;
      });

    await test.step('THEN a search from that spot returns the next spot', async (): Promise<void> => {
      const far = await graphGrouping.freeSpot(TRAVEL);
      const spots = [near, far];
      const spot = await grabbableSpotOn(page, spots, TRAVEL);

      expect(spot).toEqual(far);
    });
  });
});
