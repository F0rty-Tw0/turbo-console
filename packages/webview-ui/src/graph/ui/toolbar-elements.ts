import { graphIcon } from './graph-icon.ts';
import { textElement } from '../../shared/ui/text-element.ts';
import type { GraphIconId } from '../common/graph-icon.type.ts';
import type { ToolbarElements } from '../common/graph-page.type.ts';
import { MODE_LABEL, TASK_MODE_LABEL } from '../common/graph-task.const.ts';
import {
  CLEAR_LABEL,
  CONTROLS_LABEL,
  DETAILS_LABEL,
  EXPORT_LABEL,
  FILTERS_ON_TEXT,
  FIT_LABEL,
  PANELS_LABEL,
  RELAYOUT_LABEL,
  VIEW_LABEL
} from '../common/graph.const.ts';

/** A disabled toolbar button: its icon, then its label, whose text is the accessible name. */
const iconButton = (id: GraphIconId, label: string): HTMLButtonElement => {
  const button = textElement('button', 'text-button', '');
  const icon = graphIcon(id);
  const text = textElement('span', 'button-label', label);

  button.type = 'button';
  button.disabled = true;
  button.append(icon, text);

  return button;
};

/** A collapsed panel toggle; the panel `aside#<panelId>` arrives with the first graph. */
const panelToggle = (id: GraphIconId, label: string, panelId: string): HTMLButtonElement => {
  const button = iconButton(id, label);

  button.setAttribute('aria-controls', panelId);
  button.setAttribute('aria-expanded', 'false');

  return button;
};

/** An unpressed toggle button; task mode sets `aria-pressed` while it is on. */
const pressToggle = (id: GraphIconId, label: string): HTMLButtonElement => {
  const button = iconButton(id, label);

  button.setAttribute('aria-pressed', 'false');

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

const statusLine = (): HTMLElement => {
  const status = textElement('p', 'graph-status', '');

  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  return status;
};

/**
 * The toolbar in its pre-state, every button disabled: the Mode group (Task mode), the Panels group (Controls, Details),
 * the View group (Fit, Re-layout, Export image), Clear selection, then the status line. DOM order is the Tab order.
 */
export const buildToolbar = (): ToolbarElements => {
  const taskMode = pressToggle('tasklist', TASK_MODE_LABEL);
  const controls = panelToggle('layout-sidebar-left', CONTROLS_LABEL, 'graph-controls');
  const filtersOn = filtersOnMark();
  const details = panelToggle('layout-sidebar-right', DETAILS_LABEL, 'graph-details');
  const fit = iconButton('screen-full', FIT_LABEL);
  const relayout = iconButton('refresh', RELAYOUT_LABEL);
  const exportImage = iconButton('desktop-download', EXPORT_LABEL);
  const clear = iconButton('close', CLEAR_LABEL);
  const status = statusLine();
  const mode = toolbarGroup(MODE_LABEL, taskMode);
  const modeEnd = separator();
  const panels = toolbarGroup(PANELS_LABEL, controls, details);
  const panelsEnd = separator();
  const view = toolbarGroup(VIEW_LABEL, fit, relayout, exportImage);
  const viewEnd = separator();
  const toolbar = textElement('header', 'graph-toolbar', '');

  controls.append(filtersOn);
  toolbar.append(mode, modeEnd, panels, panelsEnd, view, viewEnd, clear, status);

  const elements: ToolbarElements = { toolbar, taskMode, controls, details, fit, relayout, exportImage, clear, status, filtersOn };

  return elements;
};
