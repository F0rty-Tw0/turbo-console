import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { readLayerBounds, watchLayerBounds } from './layer-bounds-watch.ts';
import type { BodyRecord, LayerBoundsWatch } from '../common/graph-widgets.type.ts';
import type { PageElements } from '../common/page-elements.type.ts';
import type { SwitchableMediaQueryMock } from '../test/common/media-query.type.ts';
import type { TickRunner } from '../test/common/tick-observer.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { switchableMediaQueryMock } from '../test/mocks/media-query.mock.ts';

type WatchRig = {
  readonly page: Pick<PageElements, 'body' | 'container'>;
  readonly overlay: SwitchableMediaQueryMock;
  readonly onChange: Mock<() => void>;
  /** The elements the ResizeObserver observed, in order. */
  readonly observed: Element[];
  /** Runs the ResizeObserver callbacks, as a size change does. */
  readonly resize: () => void;
  /** Runs the MutationObserver callbacks with `records`. */
  readonly mutate: (records: BodyRecord[]) => void;
  readonly watchWith: (aside: () => HTMLElement | null) => LayerBoundsWatch;
};

const setBox = (element: HTMLElement, left: number, width: number, height: number): void => {
  Object.defineProperty(element, 'offsetLeft', { value: left });
  Object.defineProperty(element, 'offsetWidth', { value: width });
  Object.defineProperty(element, 'offsetHeight', { value: height });
};

const ignore = (): void => undefined;

/** An `observe` that appends each element it is given to `list`. */
const observeInto = (list: Element[]): ((element: Element) => void) => {
  const observe = (element: Element): void => {
    list.push(element);
  };

  return observe;
};

/** A record of an element whose parent is `parent`. */
const recordIn = (parent: unknown): BodyRecord => {
  const target = { parentNode: parent };
  const record: BodyRecord = { target };

  return record;
};

const rigOf = (): WatchRig => {
  const observed: Element[] = [];
  const resizes: TickRunner[] = [];
  const mutations: ((records: BodyRecord[]) => void)[] = [];

  class RecordingResizeObserver {
    public constructor(callback: TickRunner) {
      resizes.push(callback);
    }

    public readonly observe = observeInto(observed);
  }

  class RecordingMutationObserver {
    public constructor(callback: (records: BodyRecord[]) => void) {
      mutations.push(callback);
    }

    public readonly observe = ignore;
  }

  vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
  vi.stubGlobal('MutationObserver', RecordingMutationObserver);

  const page = { body: document.createElement('div'), container: document.createElement('div') };
  const overlay = switchableMediaQueryMock(false);
  const onChange = vi.fn<() => void>();
  const rig: WatchRig = {
    page,
    overlay,
    onChange,
    observed,
    resize: (): void => resizes.forEach((tick) => tick()),
    mutate: (records): void => mutations.forEach((callback) => callback(records)),
    watchWith: (aside): LayerBoundsWatch => watchLayerBounds(page, overlay.query, aside, onChange)
  };

  return rig;
};

describe('FEATURE: watchLayerBounds', () => {
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

    it('WHEN it is built THEN only the container is observed', () => {
      expect(rig.observed).toStrictEqual([rig.page.container]);
    });

    it('WHEN the observed elements resize THEN onChange runs once', () => {
      rig.resize();

      expect(rig.onChange).toHaveBeenCalledOnce();
    });

    it('WHEN a direct child of the body is shown or hidden THEN onChange runs once', () => {
      rig.mutate([recordIn(rig.page.body)]);

      expect(rig.onChange).toHaveBeenCalledOnce();
    });

    it('WHEN an element deeper in the body is shown or hidden THEN onChange stays', () => {
      rig.mutate([recordIn(document.createElement('div'))]);

      expect(rig.onChange).not.toHaveBeenCalled();
    });

    it('WHEN the overlay query flips THEN onChange runs once', () => {
      rig.overlay.flip(true);

      expect(rig.onChange).toHaveBeenCalledOnce();
    });

    it('WHEN observeAside is called THEN nothing more is observed', () => {
      watch.observeAside();

      expect(rig.observed).toStrictEqual([rig.page.container]);
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

      expect(rig.observed).toStrictEqual([rig.page.container, aside]);
    });

    it('WHEN the observed elements resize once it exists THEN the aside is observed and onChange runs', () => {
      aside = document.createElement('aside');
      rig.resize();

      expect(rig.observed).toStrictEqual([rig.page.container, aside]);
      expect(rig.onChange).toHaveBeenCalledOnce();
    });
  });

  describe('GIVEN an aside present when the watch is built', () => {
    it('WHEN it is built THEN the container and the aside are both observed, with no onChange', () => {
      const aside = document.createElement('aside');

      rig.watchWith(() => aside);

      expect(rig.observed).toStrictEqual([rig.page.container, aside]);
      expect(rig.onChange).not.toHaveBeenCalled();
    });
  });
});

describe('FEATURE: readLayerBounds', () => {
  let container: HTMLElement;
  let aside: HTMLElement;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    container = document.createElement('div');
    aside = document.createElement('aside');
    setBox(container, 0, 400, 300);
    setBox(aside, 300, 100, 300);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GIVEN the panel overlays the canvas WHEN the bounds are read THEN the size and the panel edge come back', () => {
    expect(readLayerBounds(container, aside, true)).toStrictEqual({ width: 400, height: 300, overlayLeft: 300 });
  });

  it('GIVEN the panel is docked WHEN the bounds are read THEN there is no overlay edge', () => {
    expect(readLayerBounds(container, aside, false)).toStrictEqual({ width: 400, height: 300, overlayLeft: null });
  });

  it('GIVEN no panel WHEN the bounds are read THEN there is no overlay edge', () => {
    expect(readLayerBounds(container, null, true)).toStrictEqual({ width: 400, height: 300, overlayLeft: null });
  });
});
