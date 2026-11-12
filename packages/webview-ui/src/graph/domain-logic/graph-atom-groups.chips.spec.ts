import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphAtomGroups } from './graph-atom-groups.ts';
import type { Position } from '../../bridge/common/graph-state.type.ts';
import type { AtomChipBox } from '../common/atom-chips.type.ts';
import type { AtomRig } from '../test/common/graph-atom-groups.type.ts';
import { atomChipsMock } from '../test/mocks/atom-chips.mock.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { layerRowAt, layerRowsOf, textRowOf } from '../test/utils/atom-chips.spec.util.ts';
import { BASE, E2E_CI, LIB_CI, SIZES, TASKS, atomRigOf, layoutOf, statesOf } from '../test/utils/graph-atom-groups.spec.util.ts';

const UMBRELLA = 'app#e2e-ci';

const SHOWN_UMBRELLA = new Set([UMBRELLA]);

const SHOWN_BOTH = new Set([UMBRELLA, 'lib#e2e-ci']);

const CENTRE: Position = { x: 10, y: 20 };

const MOVED: Position = { x: 110, y: 20 };

const BOX: AtomChipBox = { centre: CENTRE, width: 200 };

const MOVED_BOX: AtomChipBox = { centre: MOVED, width: 200 };

describe('FEATURE: the chip rows of the Atomizer groups', () => {
  let layer: HTMLElement;
  let rig: AtomRig;
  let groups: GraphAtomGroups;

  const rowTexts = (): string[] => layerRowsOf(layer).map((row) => row.textContent);

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    layer = document.createElement('div');
    rig = atomRigOf(atomChipsMock(layer, textRowOf));
    rig.atoms.boxOf.mockReturnValue(BOX);
    groups = new GraphAtomGroups(rig.deps);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GIVEN groups received and atoms sent BEFORE any layout WHEN the layout is placed THEN the row appears with the kept counts', () => {
    groups.received([E2E_CI]);
    groups.states(statesOf(UMBRELLA, { files: 10, cached: 3, failed: 1 }));
    const beforeLayout = layerRowsOf(layer).length;

    groups.placed(SHOWN_UMBRELLA, layoutOf(BASE), SIZES, TASKS);

    expect([beforeLayout, rowTexts()]).toStrictEqual([0, ['10 files · 3 cached · 1 failed']]);
  });

  it('GIVEN a placed layout and no atoms yet WHEN placed THEN the row shows the file count text', () => {
    groups.received([E2E_CI]);
    groups.placed(SHOWN_UMBRELLA, layoutOf(BASE), SIZES, TASKS);

    expect(rowTexts()).toStrictEqual(['10 files']);
  });

  it('GIVEN a plain-sized task (not in the placed sizes) WHEN placed THEN it gets no row', () => {
    groups.received([E2E_CI, LIB_CI]);
    groups.placed(SHOWN_BOTH, layoutOf(BASE), SIZES, TASKS);

    expect(layerRowsOf(layer).map((row) => row.dataset['umbrella'])).toStrictEqual([UMBRELLA]);
  });

  describe('GIVEN the umbrella placed with its row', () => {
    beforeEach(() => {
      groups.received([E2E_CI]);
      groups.placed(SHOWN_UMBRELLA, layoutOf(BASE), SIZES, TASKS);
    });

    it('WHEN the group leaves in received() THEN its row is removed', () => {
      groups.received([LIB_CI]);

      expect(layerRowsOf(layer)).toHaveLength(0);
    });

    it('WHEN atoms change the numbers THEN the row text follows', () => {
      groups.states(statesOf(UMBRELLA, { files: 10, cached: 4, failed: null }));

      expect(rowTexts()).toStrictEqual(['10 files · 4 cached']);
    });

    it('WHEN the umbrella moves and a frame is rendered THEN the row follows it', () => {
      rig.atoms.boxOf.mockReturnValue(MOVED_BOX);
      groups.rendered();

      expect(layerRowAt(layer, 0).style.transform).toBe('translate(10px, 20px) scale(1)');
    });

    it('WHEN cleared THEN no row remains', () => {
      groups.clear();

      expect(layerRowsOf(layer)).toHaveLength(0);
    });

    it('WHEN the group is expanded by a toggle THEN its row stays', () => {
      groups.toggle(UMBRELLA);

      expect(rowTexts()).toStrictEqual(['10 files']);
    });
  });
});
