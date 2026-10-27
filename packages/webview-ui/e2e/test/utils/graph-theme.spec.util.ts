import type { ThemeSwitch } from '../../common/graph-theme.type.ts';

/**
 * Runs in the page through `evaluate`, so it reads only its argument. Clears every theme variable, sets the theme's
 * own on `documentElement`, then sets the body class: the order VS Code's `applyStyles` uses, and the class change is
 * what makes the page read its colours again.
 */
export const switchTheme = ({ names, theme }: ThemeSwitch): void => {
  for (const name of names) document.documentElement.style.removeProperty(name);

  for (const [name, value] of Object.entries(theme.vars)) document.documentElement.style.setProperty(name, value);

  document.body.className = theme.bodyClass;
};

/** Cytoscape writes `rgb(1,2,3)` and the stubs `rgb(1, 2, 3)`; both compare as the former. */
export const withoutSpaces = (colour: string): string => colour.replaceAll(' ', '');
