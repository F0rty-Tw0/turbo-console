import { describe, expect, it } from 'vitest';

import { clampedWidthsOf, maxWidthOf } from './panel-widths.util.ts';
import type { PanelWidths } from '../../bridge/common/graph-view-state.type.ts';
import { DEFAULT_PANEL_WIDTHS } from '../common/graph.const.ts';
import type { PanelSide } from '../common/panel-sash.type.ts';

type Case = [preferred: PanelWidths, body: number, isOverlay: boolean, dragged: PanelSide | null, expected: PanelWidths];

type Row = [title: string, ...Case];

const ROWS: Row[] = [
  ['both fit', DEFAULT_PANEL_WIDTHS, 1200, false, null, { controls: 260, details: 280 }],
  ['under 200 rises to 200', { controls: 100, details: 50 }, 1200, false, null, { controls: 200, details: 200 }],
  ['over half the body is cut to half', { controls: 900, details: 250 }, 1400, false, null, { controls: 700, details: 250 }],
  [
    'sum rule, Details dragged: Controls shrinks',
    { controls: 400, details: 300 },
    1000,
    false,
    'details',
    { controls: 280, details: 300 }
  ],
  [
    'sum rule, Controls dragged: Details to 200, Controls gives the rest',
    { controls: 400, details: 300 },
    1000,
    false,
    'controls',
    { controls: 380, details: 200 }
  ],
  ['sum rule, nothing dragged: Controls first', { controls: 400, details: 300 }, 1000, false, null, { controls: 280, details: 300 }],
  ['overlay Details is outside the sum', { controls: 300, details: 600 }, 800, true, null, { controls: 300, details: 400 }],
  ['overlay Controls alone keeps body - 420', { controls: 500, details: 300 }, 700, true, null, { controls: 280, details: 300 }],
  ['200 beats the cap and the sum', DEFAULT_PANEL_WIDTHS, 500, false, null, { controls: 200, details: 200 }]
];

describe('FEATURE: clampedWidthsOf', () => {
  it.each(ROWS)('GIVEN %s WHEN clamped THEN the drawn pair', (_title, ...row: Case) => {
    const [preferred, body, isOverlay, dragged, expected] = row;
    const drawn = clampedWidthsOf(preferred, body, isOverlay, dragged);

    expect(drawn).toStrictEqual(expected);
  });
});

describe('FEATURE: maxWidthOf', () => {
  it.each([
    ['controls', 1200, false, 580],
    ['details', 1200, false, 580],
    ['details', 800, true, 400]
  ] as const)('GIVEN the %s side at body %i overlay %s WHEN maxWidthOf THEN %i', (side, body, isOverlay, max) => {
    const widest = maxWidthOf(side, DEFAULT_PANEL_WIDTHS, body, isOverlay);

    expect(widest).toBe(max);
  });
});
