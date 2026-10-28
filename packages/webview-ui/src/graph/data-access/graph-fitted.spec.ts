import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFittedCamera } from './graph-fitted.ts';
import type { FittedCamera } from '../common/fitted-camera.type.ts';
import type { GraphViewHandlers } from '../common/graph-page.type.ts';

type FittedHandlers = Pick<GraphViewHandlers, 'onViewport' | 'onRefit'>;

describe('FEATURE: createFittedCamera', () => {
  let cy: Core;
  let frames: (() => void)[];
  let events: string[];
  let fittedAtViewport: boolean[];
  let handlers: FittedHandlers;
  let camera: FittedCamera;

  const flush = (): void => {
    const pending = frames.splice(0);

    pending.forEach((run: () => void): void => run());
  };

  beforeEach(() => {
    const ids = ['a', 'b'];
    const elementOf = (id: string): ElementDefinition => {
      const data = { id };
      const element: ElementDefinition = { data };

      return element;
    };
    const elements = ids.map(elementOf);

    cy = cytoscape({ headless: true, styleEnabled: true, elements });
    frames = [];
    events = [];
    fittedAtViewport = [];
    vi.spyOn(cy, 'fit').mockImplementation((): Core => {
      events.push('fit');
      cy.emit('viewport');

      return cy;
    });
    cy.on('resize', (): void => void events.push('resize'));
    handlers = {
      onViewport: vi.fn((): void => void fittedAtViewport.push(camera.isFitted())),
      onRefit: vi.fn((): void => void events.push('refit'))
    };
    camera = createFittedCamera(cy, handlers, (run: () => void): void => void frames.push(run));
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

    it('WHEN the container resizes THEN only resize runs', () => {
      camera.resized();
      flush();

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
      'WHEN %s fires THEN it is not fitted and onViewport hears it once, after the clear',
      (name: string) => {
        cy.emit(name);

        expect(camera.isFitted()).toBe(false);
        expect(fittedAtViewport).toStrictEqual([false]);
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
      cy.panBy({ x: 40, y: 0 });
      cy.emit('pan zoom viewport');

      expect(camera.isFitted()).toBe(true);
    });

    describe('WHEN the container resizes', () => {
      it('THEN nothing runs before the frame, then resize, fit, refit in that order', () => {
        camera.resized();

        expect(events).toStrictEqual([]);

        flush();

        expect(events).toStrictEqual(['resize', 'fit', 'refit']);
        expect(camera.isFitted()).toBe(true);
      });

      it('THEN three resizes in one frame run once, and the next resize runs again', () => {
        camera.resized();
        camera.resized();
        camera.resized();

        expect(frames).toHaveLength(1);

        flush();

        expect(handlers.onRefit).toHaveBeenCalledOnce();

        camera.resized();
        flush();

        expect(handlers.onRefit).toHaveBeenCalledTimes(2);
      });

      it('THEN a pan before the frame stops the re-fit', () => {
        camera.resized();
        cy.emit('dragpan');
        flush();

        expect(events).toStrictEqual(['resize']);
        expect(handlers.onRefit).not.toHaveBeenCalled();
      });
    });
  });
});
