import cytoscape from 'cytoscape';
import { describe, expect, it, vi } from 'vitest';

import { drawWithoutLayers } from './graph-probe-layers.ts';
import type { ProbeLayerSource } from '../common/graph-probe-layers.type.ts';

const LAYERS = ['layer'];

const EMPTY = {};

const GET_LAYERS_NOT_A_FUNCTION = { getLayers: LAYERS };

const sourceOf = (renderer: unknown): ProbeLayerSource => {
  const source: ProbeLayerSource = { forceRender: vi.fn(), renderer: (): unknown => renderer };

  return source;
};

/** A renderer whose `data.lyrTxrCache` is `cache`, the path Cytoscape's canvas renderer keeps it at. */
const rendererWith = (cache: unknown): unknown => {
  const data = { lyrTxrCache: cache };
  const renderer = { data };

  return renderer;
};

describe('FEATURE: drawWithoutLayers', () => {
  describe('GIVEN a renderer whose layered texture cache hands out layers', () => {
    it('WHEN the probe draws without layers THEN the cache hands out none', () => {
      const cache = { getLayers: (): string[] => LAYERS };
      const source = sourceOf(rendererWith(cache));

      drawWithoutLayers(source);

      expect(cache.getLayers()).toBeNull();
    });

    it('WHEN the probe draws without layers THEN Cytoscape force-renders once', () => {
      const cache = { getLayers: (): string[] => LAYERS };
      const source = sourceOf(rendererWith(cache));

      drawWithoutLayers(source);

      expect(source.forceRender).toHaveBeenCalledOnce();
    });
  });

  it.each([
    ['a renderer that is null', null],
    ['a renderer without data', {}],
    ['renderer data without a layered cache', { data: EMPTY }],
    ['a layered cache without getLayers', rendererWith(EMPTY)],
    ['a layered cache whose getLayers is no function', rendererWith(GET_LAYERS_NOT_A_FUNCTION)]
  ])('GIVEN %s WHEN the probe draws without layers THEN it throws before any render', (_name, renderer: unknown) => {
    const source = sourceOf(renderer);

    expect(() => drawWithoutLayers(source)).toThrow('graph e2e: no layered texture cache');
    expect(source.forceRender).not.toHaveBeenCalled();
  });

  it('GIVEN a source without a renderer WHEN the probe draws without layers THEN it throws before any render', () => {
    const source: ProbeLayerSource = { forceRender: vi.fn() };

    expect(() => drawWithoutLayers(source)).toThrow('graph e2e: no layered texture cache');
    expect(source.forceRender).not.toHaveBeenCalled();
  });

  it('GIVEN a headless Cytoscape, which has no canvas renderer WHEN the probe draws without layers THEN it throws', () => {
    const cy = cytoscape({ headless: true });

    expect(() => drawWithoutLayers(cy)).toThrow('graph e2e: no layered texture cache');

    cy.destroy();
  });
});
