import { describe, expect, it } from 'vitest';

import { kindOf, rowStopOf, shownKindsOf } from './row-stop.util.ts';
import type { RowButtonKind, RowPlan } from '../common/widget.type.ts';

type StopRow = { preferred: RowButtonKind; shown: RowButtonKind[]; expected: RowButtonKind };

const planOf = (flags: Pick<RowPlan, 'isChevronShown' | 'isFocusShown' | 'isEllipsisShown'>): RowPlan => {
  const placement = { x: 0, y: 0, width: 200, scale: 1 };
  const plan: RowPlan = { folder: 'apps', kind: 'box', placement, ...flags };

  return plan;
};

describe('FEATURE: shownKindsOf', () => {
  describe('GIVEN every button shown', () => {
    it('WHEN the kinds are read THEN they follow the DOM order', () => {
      const plan = planOf({ isChevronShown: true, isFocusShown: true, isEllipsisShown: true });

      const kinds = shownKindsOf(plan);

      expect(kinds).toStrictEqual(['chevron', 'title', 'focus', 'ellipsis']);
    });
  });

  describe('GIVEN the chevron and Focus folder hidden', () => {
    it('WHEN the kinds are read THEN the title and "…" remain', () => {
      const plan = planOf({ isChevronShown: false, isFocusShown: false, isEllipsisShown: true });

      const kinds = shownKindsOf(plan);

      expect(kinds).toStrictEqual(['title', 'ellipsis']);
    });
  });
});

describe('FEATURE: rowStopOf', () => {
  const rows: StopRow[] = [
    { preferred: 'chevron', shown: ['title', 'focus', 'ellipsis'], expected: 'title' },
    { preferred: 'ellipsis', shown: ['chevron', 'title', 'ellipsis'], expected: 'ellipsis' },
    { preferred: 'focus', shown: ['chevron', 'title', 'ellipsis'], expected: 'chevron' }
  ];

  it.each(rows)(
    'GIVEN the stop $preferred and shown $shown WHEN the stop is read THEN it is $expected',
    ({ preferred, shown, expected }) => {
      const stop = rowStopOf(preferred, shown);

      expect(stop).toBe(expected);
    }
  );

  describe('GIVEN no button shown', () => {
    it('WHEN the stop is read THEN it is the title', () => {
      const stop = rowStopOf('chevron', []);

      expect(stop).toBe('title');
    });
  });
});

describe('FEATURE: kindOf', () => {
  const elements = { chevron: new EventTarget(), title: new EventTarget(), focus: new EventTarget(), ellipsis: new EventTarget() };

  describe('GIVEN the Focus folder button', () => {
    it('WHEN its kind is read THEN it is focus', () => {
      const kind = kindOf(elements, elements.focus);

      expect(kind).toBe('focus');
    });
  });

  describe('GIVEN a foreign target', () => {
    it('WHEN its kind is read THEN it is undefined', () => {
      const kind = kindOf(elements, new EventTarget());

      expect(kind).toBeUndefined();
    });
  });
});
