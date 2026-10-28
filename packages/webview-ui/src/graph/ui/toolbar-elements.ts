import { graphIcon } from './graph-icon.ts';
import { iconButton, iconTextButton } from './icon-button.ts';
import { buildLegend } from './legend-elements.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';
import {
  MODE_LABEL,
  PACKAGES_MODE_LABEL,
  PACKAGES_MODE_TITLE,
  TASKS_MODE_LABEL,
  TASKS_MODE_TITLE
} from '../common/graph-task.const.ts';
import type { ToolbarElements } from '../common/graph-toolbar.type.ts';
import {
  CONTROLS_ID,
  CONTROLS_LABEL,
  CONTROLS_TITLE,
  DETAILS_ID,
  DETAILS_LABEL,
  DETAILS_TITLE,
  EXPORT_LABEL,
  EXPORT_TITLE,
  FILTERS_ON_TEXT,
  FIT_LABEL,
  FIT_TITLE,
  PANELS_LABEL,
  RELAYOUT_LABEL,
  RELAYOUT_TITLE,
  VIEW_LABEL
} from '../common/graph.const.ts';

/** A disabled toolbar button: its icon, then its label. */
const labelledButton = (id: GraphIconId, label: string, title: string): HTMLButtonElement => {
  const button = iconTextButton(id, label, title);

  button.disabled = true;

  return button;
};

/** A disabled icon-only View action. */
const viewAction = (id: GraphIconId, label: string, title: string): HTMLButtonElement => {
  const button = iconButton(id, label, title);

  button.disabled = true;

  return button;
};

/** A collapsed panel toggle; the panel `aside#<panelId>` arrives with the first graph. */
const panelToggle = (id: GraphIconId, label: string, title: string, panelId: string): HTMLButtonElement => {
  const button = labelledButton(id, label, title);

  button.setAttribute('aria-controls', panelId);
  button.setAttribute('aria-expanded', 'false');

  return button;
};

/** A toggle button with its `aria-pressed` set; the task panel flips it as the mode changes. */
const pressToggle = (id: GraphIconId, label: string, title: string, isPressed: boolean): HTMLButtonElement => {
  const button = labelledButton(id, label, title);

  button.setAttribute('aria-pressed', String(isPressed));

  return button;
};

/** The Controls button's "filters on" icon and word, hidden until a filter is on. */
const filtersOnMark = (): HTMLElement => {
  const mark = textElement('span', 'filters-on', '');
  const icon = graphIcon('filter');
  const text = textElement('span', '', FILTERS_ON_TEXT);

  mark.hidden = true;
  mark.append(icon, text);

  return mark;
};

const toolbarGroup = (label: string, ...buttons: HTMLButtonElement[]): HTMLElement => {
  const group = textElement('div', 'toolbar-group', '');

  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);
  group.append(...buttons);

  return group;
};

const separator = (): HTMLElement => {
  const line = textElement('span', 'toolbar-separator', '');

  line.setAttribute('aria-hidden', 'true');

  return line;
};

/** The selection's live region: read out, never drawn; the Details bar shows the same text. */
const statusLine = (): HTMLElement => {
  const status = textElement('p', 'graph-status visually-hidden', '');

  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  return status;
};

/**
 * The toolbar in its pre-state, every button disabled: the Mode group (Packages, Tasks), the Panels group (Controls, Details),
 * the View group (Fit, Re-layout, Export image, Legend), the hidden status line, then the closed Legend popover. DOM order
 * is the Tab order.
 */
export const buildToolbar = (): ToolbarElements => {
  const packagesMode = pressToggle('type-hierarchy', PACKAGES_MODE_LABEL, PACKAGES_MODE_TITLE, true);
  const taskMode = pressToggle('tasklist', TASKS_MODE_LABEL, TASKS_MODE_TITLE, false);
  const controls = panelToggle('layout-sidebar-left', CONTROLS_LABEL, CONTROLS_TITLE, CONTROLS_ID);
  const filtersOn = filtersOnMark();
  const details = panelToggle('layout-sidebar-right', DETAILS_LABEL, DETAILS_TITLE, DETAILS_ID);
  const fit = viewAction('screen-full', FIT_LABEL, FIT_TITLE);
  const relayout = viewAction('refresh', RELAYOUT_LABEL, RELAYOUT_TITLE);
  const exportImage = viewAction('desktop-download', EXPORT_LABEL, EXPORT_TITLE);
  const status = statusLine();
  const legend = buildLegend();
  const modeGroup = toolbarGroup(MODE_LABEL, packagesMode, taskMode);
  const modeEnd = separator();
  const panels = toolbarGroup(PANELS_LABEL, controls, details);
  const panelsEnd = separator();
  const view = toolbarGroup(VIEW_LABEL, fit, relayout, exportImage, legend.legend);
  const toolbar = textElement('header', 'graph-toolbar', '');

  controls.append(filtersOn);
  toolbar.append(modeGroup, modeEnd, panels, panelsEnd, view, status, legend.legendPanel);

  const elements: ToolbarElements = {
    toolbar,
    modeGroup,
    modeEnd,
    packagesMode,
    taskMode,
    controls,
    details,
    fit,
    relayout,
    exportImage,
    status,
    filtersOn,
    ...legend
  };

  return elements;
};
