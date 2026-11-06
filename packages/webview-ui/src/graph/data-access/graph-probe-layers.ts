import type { ProbeLayerSource } from '../common/graph-probe-layers.type.ts';

type WithData = {
  readonly data: unknown;
};

type WithLayerCache = {
  readonly lyrTxrCache: unknown;
};

/** The canvas renderer's layered texture cache (cytoscape 3.34 `drawLayeredElements`), untyped like the renderer. */
type LayerCache = {
  getLayers: () => unknown;
};

const hasData = (value: unknown): value is WithData => typeof value === 'object' && value !== null && 'data' in value;

const hasLayerCache = (value: unknown): value is WithLayerCache =>
  typeof value === 'object' && value !== null && 'lyrTxrCache' in value;

const isLayerCache = (value: unknown): value is LayerCache =>
  typeof value === 'object' && value !== null && 'getLayers' in value && typeof value.getLayers === 'function';

const layerCacheOf = (cy: ProbeLayerSource): unknown => {
  const renderer = cy.renderer?.();

  if (!hasData(renderer)) return null;

  const { data } = renderer;

  if (!hasLayerCache(data)) return null;

  return data.lyrTxrCache;
};

/**
 * Makes every later frame draw each element directly, the way a press frame always does, then redraws: an idle frame
 * otherwise draws a resampled layer bitmap whose edges differ from the direct frame's. Throws when the renderer has no
 * such cache, so a Cytoscape that renames it fails here and not as a pixel flake.
 */
export const drawWithoutLayers = (cy: ProbeLayerSource): void => {
  const cache = layerCacheOf(cy);

  if (!isLayerCache(cache)) throw new Error('graph e2e: no layered texture cache');

  cache.getLayers = (): null => null;
  cy.forceRender();
};
