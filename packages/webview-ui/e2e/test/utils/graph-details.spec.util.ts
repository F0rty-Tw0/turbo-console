import type { InputOptionColors, WidthChange } from '../../common/graph.type.ts';

/** Clicks the Details toggle and reads `canvas`'s width just before and just after, in the same task. Runs in the page. */
export const toggleDetailsMeasured = (canvas: Element): WidthChange => {
  const toggle = document.querySelector('header [aria-controls="graph-details"]');

  if (!(toggle instanceof HTMLElement)) throw new Error('graph e2e: no Details toggle');

  const before = canvas.getBoundingClientRect().width;

  toggle.click();

  const after = canvas.getBoundingClientRect().width;
  const change: WidthChange = { before, after };

  return change;
};

/** Runs in the page through `evaluate`: sets each colour on the root the way `GraphLook.applyTheme` sets a theme variable. */
export const setInputOptionVars = (colors: InputOptionColors): void => {
  const root = document.documentElement.style;

  root.setProperty('--vscode-inputOption-activeBackground', colors.background);
  root.setProperty('--vscode-inputOption-activeBorder', colors.border);
  root.setProperty('--vscode-inputOption-activeForeground', colors.foreground);
};

/** Runs in the page through `evaluateAll`: each button's `aria-disabled` value, `null` when it has none. */
export const disabledMarksOf = (buttons: Element[]): (string | null)[] => {
  return buttons.map((button): string | null => button.getAttribute('aria-disabled'));
};
