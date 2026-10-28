import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { placeRow } from './widget-row-place.ts';
import type { FolderRowElements, RowButtonKind, RowEntry, RowPlan } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';
import { ROW_ORDER } from '../utils/row-stop.util.ts';

type PlanFlags = Pick<RowPlan, 'isChevronShown' | 'isFocusShown' | 'isEllipsisShown'>;

const ALL_SHOWN: PlanFlags = { isChevronShown: true, isFocusShown: true, isEllipsisShown: true };

const planOf = (flags: PlanFlags): RowPlan => {
  const placement = { x: 0, y: 0, width: 200, scale: 1 };
  const plan: RowPlan = { folder: 'apps', kind: 'box', placement, ...flags };

  return plan;
};

const entryOf = (elements: FolderRowElements, preferred: RowButtonKind): RowEntry => {
  const entry: RowEntry = { kind: 'box', count: 2, elements, shown: [], preferred };

  return entry;
};

/** The tabIndex of chevron, title, Focus folder and "…", in that order. */
const tabIndexesOf = (elements: FolderRowElements): number[] => ROW_ORDER.map((kind) => elements[kind].tabIndex);

/** Counts the writes to the button's tabIndex from now on. */
const writesTo = (button: HTMLButtonElement): number[] => {
  const writes: number[] = [];
  let current = button.tabIndex;

  Object.defineProperty(button, 'tabIndex', {
    get: (): number => current,
    set: (value: number): void => {
      current = value;
      writes.push(value);
    }
  });

  return writes;
};

describe('FEATURE: placeRow Tab stop', () => {
  let elements: FolderRowElements;

  beforeEach((): void => {
    vi.stubGlobal('document', fakeDocumentMock());
    const { views } = widgetRowViewsMock();

    elements = views.row('box', 'apps', 2);
  });

  afterEach((): void => {
    vi.unstubAllGlobals();
  });

  it('GIVEN every button shown and the stop on the chevron WHEN the row is placed THEN only the chevron is a Tab stop', () => {
    placeRow(entryOf(elements, 'chevron'), planOf(ALL_SHOWN));

    expect(tabIndexesOf(elements)).toStrictEqual([0, -1, -1, -1]);
  });

  it('GIVEN the chevron hidden WHEN the row is placed THEN the title is the Tab stop', () => {
    placeRow(entryOf(elements, 'chevron'), planOf({ ...ALL_SHOWN, isChevronShown: false }));

    expect(tabIndexesOf(elements)).toStrictEqual([-1, 0, -1, -1]);
  });

  it('GIVEN the stop moved to Focus folder, shown WHEN the row is placed THEN Focus folder stays the Tab stop', () => {
    placeRow(entryOf(elements, 'focus'), planOf(ALL_SHOWN));

    expect(tabIndexesOf(elements)).toStrictEqual([-1, -1, 0, -1]);
  });

  it('GIVEN a row placed once WHEN it is placed again with the same plan THEN no tabIndex is written', () => {
    const entry = entryOf(elements, 'chevron');
    const plan = planOf({ ...ALL_SHOWN, isChevronShown: false });

    placeRow(entry, plan);

    const writes = ROW_ORDER.map((kind) => writesTo(elements[kind]));

    placeRow(entry, plan);

    expect(writes.flat()).toStrictEqual([]);
  });
});
