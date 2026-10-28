import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFittedCamera } from './graph-fitted.ts';
import type { FittedCamera } from '../common/fitted-camera.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';

type FittedHandlers = Pick<GraphViewHandlers, 'onViewport' | 'onRefit'>;

describe('FEATURE: createFittedCamera', () => {
  let cy: Core;
  let events: string[];
  let fittedAtViewport: boolean[];
  let handlers: FittedHandlers;
  let camera: FittedCamera;

  beforeEach(() => {
    const ids = ['a', 'b'];
    const elementOf = (id: string): ElementDefinition => {
      const data = { id };
      const element: ElementDefinition = { data };

      return element;
    };
    const elements = ids.map(elementOf);

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    events = [];
    fittedAtViewport = [];
    vi.spyOn(cy, 'fit').mockImplementation((): Core => {
      events.push('fit');
      cy.zoom(cy.zoom() + 1);

      return cy;
    });
    cy.on('resize', (): void => void events.push('resize'));
    handlers = {
      onViewport: vi.fn((): void => void fittedAtViewport.push(camera.isFitted())),
      onRefit: vi.fn((): void => void events.push('refit'))
    };
    camera = createFittedCamera(cy, handlers);
  });

  afterEach(() => {
    cy.destroy();
  });

  it('GIVEN a new camera THEN it is not fitted', () => {
    expect(camera.isFitted()).toBe(false);
  });

  describe('GIVEN a new camera', () => {
    it('WHEN fit runs THEN it is fitted before the viewport event it emits', () => {
      const seen: boolean[] = [];

      cy.on('viewport', (): void => void seen.push(camera.isFitted()));

      camera.fit();

      expect(camera.isFitted()).toBe(true);
      expect(seen).toStrictEqual([true]);
    });

    it('WHEN dragpan fires THEN onViewport is not called again', () => {
      cy.emit('dragpan');

      expect(handlers.onViewport).not.toHaveBeenCalled();
    });

    it('WHEN the container resizes THEN only resize runs, at once', () => {
      camera.resized();

      expect(events).toStrictEqual(['resize']);
      expect(handlers.onRefit).not.toHaveBeenCalled();
    });
  });

  describe('GIVEN a fitted camera', () => {
    beforeEach(() => {
      camera.fit();
      events.length = 0;
    });

    it.each(['dragpan', 'scrollzoom', 'pinchzoom'])(
      'WHEN the camera moves and %s fires THEN it is not fitted and onViewport hears it once, after the clear',
      (name: string) => {
        cy.panBy({ x: 5, y: 0 });
        cy.emit(name);

        expect(camera.isFitted()).toBe(false);
        expect(fittedAtViewport).toStrictEqual([false]);
      }
    );

    it.each(['dragpan', 'scrollzoom', 'pinchzoom'])(
      'WHEN %s fires and the camera did not move, as at a clamped zoom, THEN it stays fitted and onViewport is not called',
      (name: string) => {
        cy.emit(name);

        expect(camera.isFitted()).toBe(true);
        expect(handlers.onViewport).not.toHaveBeenCalled();
      }
    );

    it('WHEN setViewport runs THEN it is not fitted before the viewport event, and zoom and pan are set', () => {
      const seen: boolean[] = [];

      cy.on('viewport', (): void => void seen.push(camera.isFitted()));

      camera.setViewport(2, { x: 5, y: 6 });

      expect(camera.isFitted()).toBe(false);
      expect(seen).toStrictEqual([false]);
      expect(cy.zoom()).toBe(2);
      expect(cy.pan()).toStrictEqual({ x: 5, y: 6 });
    });

    it('WHEN centreOn runs THEN it is not fitted', () => {
      camera.centreOn('a');

      expect(camera.isFitted()).toBe(false);
    });

    it('WHEN a keep-clear panBy and a programmatic pan zoom viewport emit THEN it stays fitted', () => {
      camera.panBy(40);
      cy.emit('pan zoom viewport');

      expect(camera.isFitted()).toBe(true);
    });

    it('WHEN a keep-clear panBy runs THEN it pans by dx, with the zoom unchanged', () => {
      const zoom = cy.zoom();

      camera.panBy(40);

      expect(cy.pan()).toStrictEqual({ x: 40, y: 0 });
      expect(cy.zoom()).toBe(zoom);
    });

    it('WHEN a keep-clear panBy runs and then a scrollzoom moves nothing THEN it stays fitted', () => {
      camera.panBy(40);
      cy.emit('scrollzoom');

      expect(camera.isFitted()).toBe(true);
    });

    it('WHEN the container resizes THEN resize, fit and refit run at once, in that order, and it stays fitted', () => {
      camera.resized();

      expect(events).toStrictEqual(['resize', 'fit', 'refit']);
      expect(camera.isFitted()).toBe(true);
    });

    it('WHEN the container resizes and then a scrollzoom moves nothing THEN it stays fitted', () => {
      camera.resized();
      cy.emit('scrollzoom');

      expect(camera.isFitted()).toBe(true);
    });

    it('WHEN the user pans and then the container resizes THEN only resize runs', () => {
      cy.panBy({ x: 5, y: 0 });
      cy.emit('dragpan');
      camera.resized();

      expect(events).toStrictEqual(['resize']);
      expect(handlers.onRefit).not.toHaveBeenCalled();
    });
  });
});
