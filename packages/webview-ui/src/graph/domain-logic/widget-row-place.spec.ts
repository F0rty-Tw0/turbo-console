import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { placeRow } from './widget-row-place.ts';
import type { FolderRowElements, RowButtonKind, RowEntry, RowPlan } from '../common/widget.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';
import { widgetRowViewsMock } from '../test/mocks/widget-row-views.mock.ts';
import { accessLogOf } from '../test/utils/access-log.spec.util.ts';
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

  it('GIVEN every button shown, the stop on the chevron and the tab index left on Focus folder WHEN the row is placed THEN only the chevron is a Tab stop', () => {
    elements.chevron.tabIndex = -1;
    elements.focus.tabIndex = 0;

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

  it('GIVEN a row placed once WHEN it is placed again with the same plan THEN nothing is written and no layout is read', () => {
    const entry = entryOf(elements, 'chevron');
    const plan = planOf({ ...ALL_SHOWN, isChevronShown: false });

    placeRow(entry, plan);

    const buttons = ROW_ORDER.map((kind) => elements[kind]);
    const log = accessLogOf([elements.root, ...buttons]);

    placeRow(entry, plan);

    expect(log).toStrictEqual([]);
  });
});
