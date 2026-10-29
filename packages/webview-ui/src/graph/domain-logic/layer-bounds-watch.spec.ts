import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { readLayerBounds, watchLayerBounds } from './layer-bounds-watch.ts';
import type { BodyRecord, LayerBoundsWatch } from '../common/graph-widgets.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import type { SwitchableMediaQueryMock } from '../test/common/media-query.type.ts';
import type { ObserveCall, TickRunner } from '../test/common/tick-observer.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { switchableMediaQueryMock } from '../test/mocks/media-query.mock.ts';
import { tickObserverMock } from '../test/mocks/tick-observer.mock.ts';
import { bodyRecordIn } from '../test/utils/body-record.spec.util.ts';
import { setBox } from '../test/utils/element-box.spec.util.ts';

type WatchRig = {
  readonly page: Pick<PageElements, 'body' | 'container'>;
  readonly overlay: SwitchableMediaQueryMock;
  readonly onChange: Mock<() => void>;
  /** The `observe` calls of the ResizeObserver, in order. */
  readonly observed: ObserveCall[];
  /** The `observe` calls of the MutationObserver, in order. */
  readonly bodyWatched: ObserveCall[];
  /** Runs the ResizeObserver callbacks, as a size change does. */
  readonly resize: () => void;
  /** Runs the MutationObserver callbacks with `records`. */
  readonly mutate: (records: BodyRecord[]) => void;
  readonly watchWith: (aside: () => HTMLElement | null) => LayerBoundsWatch;
};

const rigOf = (): WatchRig => {
  const observed: ObserveCall[] = [];
  const bodyWatched: ObserveCall[] = [];
  const resizes: TickRunner[] = [];
  const mutations: TickRunner<[BodyRecord[]]>[] = [];

  vi.stubGlobal('ResizeObserver', tickObserverMock(resizes, observed));
  vi.stubGlobal('MutationObserver', tickObserverMock(mutations, bodyWatched));

  const page = { body: document.createElement('div'), container: document.createElement('div') };
  const overlay = switchableMediaQueryMock(false);
  const onChange = vi.fn<() => void>();
  const rig: WatchRig = {
    page,
    overlay,
    onChange,
    observed,
    bodyWatched,
    resize: (): void => resizes.forEach((tick) => tick()),
    mutate: (records): void => mutations.forEach((callback) => callback(records)),
    watchWith: (aside): LayerBoundsWatch => watchLayerBounds(page, overlay.query, aside, onChange)
  };

  return rig;
};

describe('FEATURE: layer bounds watch', () => {
  let rig: WatchRig;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    rig = rigOf();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('GIVEN no aside yet', () => {
    let watch: LayerBoundsWatch;

    beforeEach(() => {
      watch = rig.watchWith(() => null);
    });

    describe('WHEN it is built', () => {
      it('THEN only the container is observed', () => {
        expect(rig.observed).toStrictEqual([[rig.page.container]]);
      });

      it('THEN the body subtree is watched for hidden flips', () => {
        const options = { subtree: true, attributes: true, attributeFilter: ['hidden'] };

        expect(rig.bodyWatched).toStrictEqual([[rig.page.body, options]]);
      });
    });

    it('WHEN the observed elements resize THEN onChange runs once', () => {
      rig.resize();

      expect(rig.onChange).toHaveBeenCalledOnce();
    });

    it('WHEN a direct child of the body is shown or hidden THEN onChange runs once', () => {
      rig.mutate([bodyRecordIn(rig.page.body)]);

      expect(rig.onChange).toHaveBeenCalledOnce();
    });

    it('WHEN an element deeper in the body is shown or hidden THEN onChange stays', () => {
      rig.mutate([bodyRecordIn(document.createElement('div'))]);

      expect(rig.onChange).not.toHaveBeenCalled();
    });

    it('WHEN the overlay query flips THEN onChange runs once', () => {
      rig.overlay.flip(true);

      expect(rig.onChange).toHaveBeenCalledOnce();
    });

    it('WHEN observeAside is called THEN nothing more is observed', () => {
      watch.observeAside();

      expect(rig.observed).toStrictEqual([[rig.page.container]]);
    });
  });

  describe('GIVEN an aside that mounts after the watch is built', () => {
    let aside: HTMLElement | null;
    let watch: LayerBoundsWatch;

    beforeEach(() => {
      aside = null;
      watch = rig.watchWith(() => aside);
    });

    it('WHEN observeAside is called twice once it exists THEN the aside is observed once', () => {
      aside = document.createElement('aside');
      watch.observeAside();
      watch.observeAside();

      expect(rig.observed).toStrictEqual([[rig.page.container], [aside]]);
    });

    describe('WHEN the observed elements resize once it exists', () => {
      beforeEach(() => {
        aside = document.createElement('aside');
        rig.resize();
      });

      it('THEN the aside is observed', () => {
        expect(rig.observed).toStrictEqual([[rig.page.container], [aside]]);
      });

      it('THEN onChange runs once', () => {
        expect(rig.onChange).toHaveBeenCalledOnce();
      });
    });
  });

  describe('GIVEN an aside present when the watch is built', () => {
    let aside: HTMLElement;

    beforeEach(() => {
      aside = document.createElement('aside');
      rig.watchWith(() => aside);
    });

    describe('WHEN it is built', () => {
      it('THEN the container and the aside are both observed', () => {
        expect(rig.observed).toStrictEqual([[rig.page.container], [aside]]);
      });

      it('THEN onChange stays', () => {
        expect(rig.onChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('GIVEN a container 400x300 and an aside at left 300', () => {
    let container: HTMLElement;
    let aside: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      aside = document.createElement('aside');
      setBox(container, 0, 400, 300);
      setBox(aside, 300, 100, 300);
    });

    it('WHEN the bounds are read while the panel overlays the canvas THEN the size and the panel edge come back', () => {
      const bounds = readLayerBounds(container, aside, true);

      expect(bounds).toStrictEqual({ width: 400, height: 300, overlayLeft: 300 });
    });

    it('WHEN the bounds are read while the panel is docked THEN there is no overlay edge', () => {
      const bounds = readLayerBounds(container, aside, false);

      expect(bounds).toStrictEqual({ width: 400, height: 300, overlayLeft: null });
    });

    it('WHEN the bounds are read with no panel THEN there is no overlay edge', () => {
      const bounds = readLayerBounds(container, null, true);

      expect(bounds).toStrictEqual({ width: 400, height: 300, overlayLeft: null });
    });
  });
});
