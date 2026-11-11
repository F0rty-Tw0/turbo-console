import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildLegend, renderLegend } from './legend-elements.ts';
import type { GraphViewMode } from '../../bridge/common/graph-view-state.type.ts';
import { FALLBACK_COLORS } from '../common/graph.const.ts';
import { LEGEND_HEADING_ID, LEGEND_ID, LEGEND_LABEL, LEGEND_ROWS, LEGEND_TITLE } from '../common/legend.const.ts';
import type { LegendElements } from '../common/legend.type.ts';
import { fakeDocumentMock } from '../test/mocks/fake-document.mock.ts';

type ToggleState = 'open' | 'closed';

const AFFECTED_CHANGED_TEXT = 'Affected (task level)';

const AFFECTED_DEPENDENCY_TEXT = 'Affected via dependency (task level)';

const toggleOf = (newState: ToggleState): Event => {
  const event = new Event('toggle');

  return Object.assign(event, { newState });
};

const childOf = (parent: Element, index: number): Element => {
  const child = parent.children[index];

  if (child === undefined) throw new Error(`legend spec: no child ${index} in ${parent.className}`);

  return child;
};

describe('FEATURE: buildLegend', () => {
  let elements: LegendElements;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    elements = buildLegend();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('WHEN the legend is built', () => {
    it('THEN the button is the Legend icon button, disabled, pointing at the panel', () => {
      const { legend } = elements;

      expect([
        legend.className,
        legend.getAttribute('aria-label'),
        legend.title,
        legend.getAttribute('popovertarget'),
        legend.disabled
      ]).toStrictEqual(['icon-button legend-button', LEGEND_LABEL, LEGEND_TITLE, LEGEND_ID, true]);
    });

    it('THEN the panel is an auto popover region named by its heading', () => {
      const { legendPanel } = elements;

      expect([
        legendPanel.id,
        legendPanel.className,
        legendPanel.getAttribute('popover'),
        legendPanel.getAttribute('role'),
        legendPanel.getAttribute('aria-labelledby')
      ]).toStrictEqual([LEGEND_ID, 'graph-legend', 'auto', 'region', LEGEND_HEADING_ID]);
    });

    it('THEN the panel holds the heading, then the packages list, then the tasks list', () => {
      const children = Array.from(elements.legendPanel.children);
      const classes = children.map((child): string => child.className);

      expect(classes).toStrictEqual(['graph-legend-heading', 'legend-list legend-packages', 'legend-list legend-tasks']);
    });

    it('THEN the heading is the labelled h2 and reads Legend', () => {
      const heading = childOf(elements.legendPanel, 0);

      expect([heading.tagName, heading.id, heading.textContent]).toStrictEqual(['H2', LEGEND_HEADING_ID, LEGEND_LABEL]);
    });

    it('THEN the two lists are the panel children named by their mode', () => {
      const { legendLists, legendPanel } = elements;

      expect([legendLists.packages, legendLists.tasks]).toStrictEqual([legendPanel.children[1], legendPanel.children[2]]);
    });
  });

  describe('GIVEN the built legend', () => {
    it('WHEN the panel opens THEN its heading takes focus', () => {
      elements.legendPanel.dispatchEvent(toggleOf('open'));

      expect(document.activeElement).toBe(elements.legendPanel.children[0]);
    });

    it('WHEN the panel closes with focus inside it THEN the Legend button takes focus', () => {
      elements.legendPanel.dispatchEvent(toggleOf('open'));
      elements.legendPanel.dispatchEvent(toggleOf('closed'));

      expect(document.activeElement).toBe(elements.legend);
    });

    it('WHEN the panel closes with focus dropped to the body THEN the Legend button takes focus', () => {
      elements.legendPanel.dispatchEvent(toggleOf('open'));
      document.body.focus();
      elements.legendPanel.dispatchEvent(toggleOf('closed'));

      expect(document.activeElement).toBe(elements.legend);
    });

    it('WHEN the panel closes with focus elsewhere THEN focus stays there', () => {
      const elsewhere = document.createElement('button');

      elements.legendPanel.dispatchEvent(toggleOf('open'));
      elsewhere.focus();
      elements.legendPanel.dispatchEvent(toggleOf('closed'));

      expect(document.activeElement).toBe(elsewhere);
    });
  });
});

describe('FEATURE: renderLegend', () => {
  let elements: LegendElements;

  beforeEach(() => {
    vi.stubGlobal('document', fakeDocumentMock());
    elements = buildLegend();
    renderLegend(elements, FALLBACK_COLORS);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const termsOf = (mode: GraphViewMode): (string | undefined)[] => {
    const rows = Array.from(elements.legendLists[mode].children);

    return rows.map((row): string | undefined => row.children[0]?.textContent);
  };

  it.each(['packages', 'tasks'] as const)('WHEN the %s list is read THEN it holds one row per legend row', (mode) => {
    const texts = LEGEND_ROWS[mode].map((row): string => row.text);

    expect(termsOf(mode)).toStrictEqual(texts);
  });

  it('WHEN a row is read THEN it is a legend-row of the term, then the swatch hidden from assistive tech', () => {
    const row = childOf(elements.legendLists.packages, 0);
    const term = childOf(row, 0);
    const swatch = childOf(row, 1);
    const svg = childOf(swatch, 0);

    expect([row.className, term.tagName, swatch.tagName]).toStrictEqual(['legend-row', 'DT', 'DD']);
    expect([svg.getAttribute('viewBox'), svg.getAttribute('aria-hidden')]).toStrictEqual(['0 0 40 20', 'true']);
  });

  it.each([
    ['dimmed', FALLBACK_COLORS.dimmedOpacity],
    ['package', 1]
  ])('WHEN the %s row is read THEN its svg root has opacity %s', (rowId, opacity) => {
    const index = LEGEND_ROWS.packages.findIndex((row): boolean => row.id === rowId);
    const row = childOf(elements.legendLists.packages, index);
    const svg = childOf(childOf(row, 1), 0);

    expect(svg.getAttribute('opacity')).toBe(String(opacity));
  });

  it('WHEN it renders again THEN the rows are replaced, not added', () => {
    renderLegend(elements, FALLBACK_COLORS);

    expect(elements.legendLists.packages.children).toHaveLength(LEGEND_ROWS.packages.length);
  });

  describe('GIVEN the task affected level', () => {
    beforeEach(() => {
      renderLegend(elements, FALLBACK_COLORS, 'task');
    });

    it('THEN the tasks list is the static rows, then the two affected rows', () => {
      const texts = LEGEND_ROWS.tasks.map((row): string => row.text);

      expect(termsOf('tasks')).toStrictEqual([...texts, AFFECTED_CHANGED_TEXT, AFFECTED_DEPENDENCY_TEXT]);
    });

    it('THEN the packages list is the static rows', () => {
      const texts = LEGEND_ROWS.packages.map((row): string => row.text);

      expect(termsOf('packages')).toStrictEqual(texts);
    });

    it('WHEN it renders again with no level THEN the tasks list is the static rows only', () => {
      renderLegend(elements, FALLBACK_COLORS, null);

      expect(elements.legendLists.tasks.children).toHaveLength(LEGEND_ROWS.tasks.length);
    });
  });
});
