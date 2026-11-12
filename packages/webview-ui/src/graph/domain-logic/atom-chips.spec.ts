import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AtomChips } from './atom-chips.ts';
import type { GraphAtomCounts } from '../../bridge/common/graph-message.type.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { AtomChipBox, AtomChipsPort, AtomChipsView } from '../common/atom-chips.type.ts';
import type { Viewport } from '../common/graph-page.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { layerRowAt, layerRowsOf, textRowOf } from '../test/utils/atom-chips.spec.util.ts';

const ALL: GraphAtomCounts = { files: 10, cached: 3, failed: 1 };

const CENTRE: Position = { x: 100, y: 50 };

const MOVED: Position = { x: 150, y: 50 };

const BOX: AtomChipBox = { centre: CENTRE, width: 200 };

const PAN: Position = { x: 10, y: 20 };

const CAMERA: Viewport = { zoom: 2, pan: PAN };

describe('FEATURE: AtomChips', () => {
  let layer: HTMLElement;
  let rowOf: Mock<AtomChipsPort['rowOf']>;
  let boxOf: Mock<AtomChipsView['atoms']['boxOf']>;
  let chips: AtomChips;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    layer = document.createElement('div');
    rowOf = vi.fn<AtomChipsPort['rowOf']>(textRowOf);
    boxOf = vi.fn<AtomChipsView['atoms']['boxOf']>(() => BOX);
    const atoms = { boxOf };
    const view: AtomChipsView = { atoms, viewport: () => CAMERA };
    const port: AtomChipsPort = { layer, rowOf };

    chips = new AtomChips({ port, view });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GIVEN one drawn umbrella WHEN synced THEN one row tagged with its id is in the layer', () => {
    chips.sync(new Map([['u', ALL]]));

    expect(layerRowsOf(layer)).toHaveLength(1);
    expect(layerRowAt(layer, 0).dataset['umbrella']).toBe('u');
  });

  it('GIVEN a row WHEN a number changes THEN it is replaced; WHEN the same text is synced THEN the element is kept', () => {
    chips.sync(new Map([['u', ALL]]));
    const first = layerRowAt(layer, 0);

    chips.sync(new Map([['u', { ...ALL, failed: 0 }]]));
    const second = layerRowAt(layer, 0);

    chips.sync(new Map([['u', { files: 10, cached: 3, failed: null }]]));

    expect([second === first, layerRowAt(layer, 0) === second]).toStrictEqual([false, true]);
    expect(layerRowsOf(layer)).toHaveLength(1);
    expect(rowOf).toHaveBeenCalledTimes(2);
  });

  it('GIVEN box centre (100,50) width 200, pan (10,20), zoom 2 WHEN placed THEN transform and width are written', () => {
    chips.sync(new Map([['u', ALL]]));
    chips.place();
    const row = layerRowAt(layer, 0);

    expect([row.style.transform, row.style.width]).toStrictEqual(['translate(10px, 120px) scale(2)', '200px']);
  });

  it('GIVEN a placed row WHEN placed again with the same box and camera THEN nothing is rewritten', () => {
    chips.sync(new Map([['u', ALL]]));
    chips.place();
    const row = layerRowAt(layer, 0);

    row.style.transform = 'marker';
    row.style.width = 'marker';
    chips.place();

    expect([row.style.transform, row.style.width]).toStrictEqual(['marker', 'marker']);
  });

  it('GIVEN a placed row WHEN the box moves THEN only the transform is written again', () => {
    chips.sync(new Map([['u', ALL]]));
    chips.place();
    const row = layerRowAt(layer, 0);

    row.style.width = 'marker';
    boxOf.mockReturnValue({ ...BOX, centre: MOVED });
    chips.place();

    expect([row.style.transform, row.style.width]).toStrictEqual(['translate(110px, 120px) scale(2)', 'marker']);
  });

  it('GIVEN boxOf is null WHEN placed THEN the row is untouched and nothing throws', () => {
    boxOf.mockReturnValue(null);
    chips.sync(new Map([['u', ALL]]));
    chips.place();
    const row = layerRowAt(layer, 0);

    expect([row.style.transform, row.style.width]).toStrictEqual([undefined, undefined]);
  });

  it('GIVEN two rows WHEN synced with one of them THEN the other row goes', () => {
    chips.sync(
      new Map([
        ['u', ALL],
        ['v', ALL]
      ])
    );
    chips.sync(new Map([['v', ALL]]));

    expect(layerRowsOf(layer).map((row) => row.dataset['umbrella'])).toStrictEqual(['v']);
  });

  it('GIVEN rows WHEN synced with an empty map THEN no row remains', () => {
    chips.sync(
      new Map([
        ['u', ALL],
        ['v', ALL]
      ])
    );
    chips.sync(new Map());

    expect(layerRowsOf(layer)).toHaveLength(0);
  });

  it('GIVEN rows WHEN cleared THEN no row remains, and a sync after builds them again', () => {
    chips.sync(
      new Map([
        ['u', ALL],
        ['v', ALL]
      ])
    );
    chips.clear();
    const afterClear = layerRowsOf(layer).length;

    chips.sync(new Map([['u', ALL]]));

    expect([afterClear, layerRowsOf(layer).length]).toStrictEqual([0, 1]);
  });
});
