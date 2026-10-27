import { iconButton } from './icon-button.ts';
import { legendSvgOf } from './legend-svg.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import { LEGEND_HEADING_ID, LEGEND_ID, LEGEND_LABEL, LEGEND_ROWS, LEGEND_TITLE } from '../common/legend.const.ts';
import type { LegendElements, LegendRow } from '../common/legend.type.ts';
import type { ThemeColors } from '../common/theme-colors.type.ts';
import { swatchPartsOf } from '../utils/legend-swatch.util.ts';

const legendButton = (): HTMLButtonElement => {
  const button = iconButton('info', LEGEND_LABEL, LEGEND_TITLE);

  button.classList.add('legend-button');
  button.setAttribute('popovertarget', LEGEND_ID);
  button.disabled = true;

  return button;
};

const legendHeading = (): HTMLElement => {
  const heading = textElement('h2', 'graph-legend-heading', LEGEND_LABEL);

  heading.id = LEGEND_HEADING_ID;
  heading.tabIndex = -1;

  return heading;
};

/**
 * Opening moves focus to the heading; closing returns it to the Legend button when it was in the panel or dropped to
 * the body. Escape, light dismiss and the button's expanded state come from the platform.
 */
const trackLegendFocus = (panel: HTMLElement, heading: HTMLElement, button: HTMLButtonElement): void => {
  const onToggle = (event: ToggleEvent): void => {
    if (event.newState === 'open') {
      heading.focus();

      return;
    }

    const active = document.activeElement;
    const isInside = panel.contains(active);

    if (isInside || active === document.body) button.focus();
  };

  panel.addEventListener('toggle', onToggle);
};

/** The Legend button and its closed popover: the heading, then one empty list per mode. */
export const buildLegend = (): LegendElements => {
  const legend = legendButton();
  const legendPanel = textElement('div', 'graph-legend', '');
  const heading = legendHeading();
  const packages = textElement('dl', 'legend-list legend-packages', '');
  const tasks = textElement('dl', 'legend-list legend-tasks', '');

  legendPanel.id = LEGEND_ID;
  legendPanel.setAttribute('popover', 'auto');
  legendPanel.setAttribute('role', 'region');
  legendPanel.setAttribute('aria-labelledby', LEGEND_HEADING_ID);
  legendPanel.append(heading, packages, tasks);
  trackLegendFocus(legendPanel, heading, legend);

  const legendLists: LegendElements['legendLists'] = { packages, tasks };
  const elements: LegendElements = { legend, legendPanel, legendLists };

  return elements;
};

/** One row: the term, then its swatch, which CSS draws to the left of it. */
const legendRowOf = (row: LegendRow, colors: ThemeColors): HTMLElement => {
  const element = textElement('div', 'legend-row', '');
  const term = textElement('dt', '', row.text);
  const swatch = textElement('dd', '', '');
  const parts = swatchPartsOf(row.swatch, colors);
  const svg = legendSvgOf(parts);

  swatch.append(svg);
  element.append(term, swatch);

  return element;
};

/** Rebuilds both lists in `colors`; the theme changed or the page started. */
export const renderLegend = (elements: Pick<LegendElements, 'legendLists'>, colors: ThemeColors): void => {
  const { packages, tasks } = elements.legendLists;
  const rowOf = (row: LegendRow): HTMLElement => legendRowOf(row, colors);
  const packageRows = LEGEND_ROWS.packages.map(rowOf);
  const taskRows = LEGEND_ROWS.tasks.map(rowOf);

  packages.replaceChildren(...packageRows);
  tasks.replaceChildren(...taskRows);
};
