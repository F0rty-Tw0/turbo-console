import type { ExpectedThemeColors, ThemeStub } from '../../common/graph-theme.type.ts';

/**
 * VS Code 1.141's default dark theme, Dark 2026 (`theme-defaults/themes/2026-dark.json`; the testing icons from the colour
 * registry), as a webview receives it: opaque colours as `#rrggbb`, colours with alpha as `rgba()` to two places.
 * `--vscode-input-*` from https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes/2026-dark.json, fetched 2026-11-13.
 */
const DARK_2026_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#121314',
  '--vscode-foreground': '#bfbfbf',
  '--vscode-panel-border': '#2a2b2c',
  '--vscode-widget-border': '#2a2b2c',
  '--vscode-descriptionForeground': '#8c8c8c',
  '--vscode-focusBorder': 'rgba(57, 148, 188, 0.7)',
  '--vscode-charts-yellow': '#e0b97f',
  '--vscode-charts-green': '#89d185',
  '--vscode-testing-iconPassed': '#73c991',
  '--vscode-testing-iconFailed': '#f48771',
  '--vscode-disabledForeground': '#555555',
  '--vscode-errorForeground': '#f48771',
  '--vscode-charts-purple': '#ad80d7',
  '--vscode-badge-background': '#307e9f',
  '--vscode-badge-foreground': '#ffffff',
  '--vscode-list-activeSelectionBackground': 'rgba(255, 255, 255, 0.13)',
  '--vscode-list-activeSelectionForeground': '#ededed',
  '--vscode-input-background': '#191a1b',
  '--vscode-input-border': '#333536'
};

/** The selected fill is white at 0.13 over `#121314`; Cytoscape draws the focus border without its alpha. */
const DARK_2026_COLORS: ExpectedThemeColors = {
  fill: 'rgb(18, 19, 20)',
  label: 'rgb(191, 191, 191)',
  frame: 'rgb(42, 43, 44)',
  edge: 'rgb(140, 140, 140)',
  selected: 'rgb(57, 148, 188)',
  selectedFill: 'rgb(49, 50, 51)',
  cardFill: 'rgb(25, 26, 27)',
  cardFrame: 'rgb(51, 53, 54)'
};

export const THEME_DARK_2026_STUB: ThemeStub = { bodyClass: 'vscode-dark', vars: DARK_2026_VARS, expected: DARK_2026_COLORS };

/** VS Code 1.141's default light theme, Light 2026 (`2026-light.json`), in the same webview form;
 * `--vscode-input-*` from https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes/2026-light.json, fetched 2026-11-13. */
const LIGHT_2026_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#ffffff',
  '--vscode-foreground': '#202020',
  '--vscode-panel-border': '#f0f1f2',
  '--vscode-widget-border': '#e2e2e5',
  '--vscode-descriptionForeground': '#606060',
  '--vscode-focusBorder': '#0069cc',
  '--vscode-charts-yellow': '#667309',
  '--vscode-charts-green': '#388a34',
  '--vscode-testing-iconPassed': '#73c991',
  '--vscode-testing-iconFailed': '#ad0707',
  '--vscode-disabledForeground': '#bbbbbb',
  '--vscode-errorForeground': '#ad0707',
  '--vscode-charts-purple': '#652d90',
  '--vscode-badge-background': '#0069cc',
  '--vscode-badge-foreground': '#ffffff',
  '--vscode-list-activeSelectionBackground': 'rgba(0, 0, 0, 0.15)',
  '--vscode-list-activeSelectionForeground': '#202020',
  '--vscode-input-background': '#ffffff',
  '--vscode-input-border': 'rgba(216, 216, 216, 0.4)'
};

/** The selected fill is black at 0.15 over white; the card frame is `#D8D8D866`, which Cytoscape draws without its alpha. */
const LIGHT_2026_COLORS: ExpectedThemeColors = {
  fill: 'rgb(255, 255, 255)',
  label: 'rgb(32, 32, 32)',
  frame: 'rgb(240, 241, 242)',
  edge: 'rgb(96, 96, 96)',
  selected: 'rgb(0, 105, 204)',
  selectedFill: 'rgb(217, 217, 217)',
  cardFill: 'rgb(255, 255, 255)',
  cardFrame: 'rgb(216, 216, 216)'
};

export const THEME_LIGHT_2026_STUB: ThemeStub = { bodyClass: 'vscode-light', vars: LIGHT_2026_VARS, expected: LIGHT_2026_COLORS };
