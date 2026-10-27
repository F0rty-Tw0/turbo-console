import type { ExpectedThemeColors, ThemeStub } from '../../common/graph-theme.type.ts';

const DARK_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#1f1f1f',
  '--vscode-foreground': '#cccccc',
  '--vscode-panel-border': '#2b2b2b',
  '--vscode-widget-border': '#313131',
  '--vscode-descriptionForeground': '#9d9d9d',
  '--vscode-focusBorder': '#0078d4',
  '--vscode-charts-yellow': '#cca700',
  '--vscode-testing-iconPassed': '#73c991',
  '--vscode-testing-iconFailed': '#f14c4c',
  '--vscode-disabledForeground': '#cccccc80',
  '--vscode-errorForeground': '#f85149',
  '--vscode-charts-purple': '#b180d7',
  '--vscode-badge-background': '#616161',
  '--vscode-badge-foreground': '#f8f8f8',
  '--vscode-list-activeSelectionBackground': '#04395e',
  '--vscode-list-activeSelectionForeground': '#ffffff'
};

const DARK_COLORS: ExpectedThemeColors = {
  fill: 'rgb(31, 31, 31)',
  label: 'rgb(204, 204, 204)',
  frame: 'rgb(43, 43, 43)',
  edge: 'rgb(157, 157, 157)',
  selected: 'rgb(0, 120, 212)',
  selectedFill: 'rgb(4, 57, 94)'
};

export const THEME_DARK_STUB: ThemeStub = { bodyClass: 'vscode-dark', vars: DARK_VARS, expected: DARK_COLORS };

const LIGHT_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#ffffff',
  '--vscode-foreground': '#3b3b3b',
  '--vscode-panel-border': '#e5e5e5',
  '--vscode-widget-border': '#e5e5e5',
  '--vscode-descriptionForeground': '#3b3b3b',
  '--vscode-focusBorder': '#005fb8',
  '--vscode-charts-yellow': '#bf8803',
  '--vscode-testing-iconPassed': '#388a34',
  '--vscode-testing-iconFailed': '#f14c4c',
  '--vscode-disabledForeground': '#61616180',
  '--vscode-errorForeground': '#f85149',
  '--vscode-charts-purple': '#652d90',
  '--vscode-badge-background': '#cccccc',
  '--vscode-badge-foreground': '#3b3b3b',
  '--vscode-list-activeSelectionBackground': '#e8e8e8',
  '--vscode-list-activeSelectionForeground': '#000000'
};

const LIGHT_COLORS: ExpectedThemeColors = {
  fill: 'rgb(255, 255, 255)',
  label: 'rgb(59, 59, 59)',
  frame: 'rgb(229, 229, 229)',
  edge: 'rgb(59, 59, 59)',
  selected: 'rgb(0, 95, 184)',
  selectedFill: 'rgb(232, 232, 232)'
};

export const THEME_LIGHT_STUB: ThemeStub = { bodyClass: 'vscode-light', vars: LIGHT_VARS, expected: LIGHT_COLORS };

/** `--vscode-panel-border` is set too, and must lose to `--vscode-contrastBorder`; no list selection colours, as VS Code's High Contrast sets none. */
const HC_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#000000',
  '--vscode-foreground': '#ffffff',
  '--vscode-panel-border': '#808080',
  '--vscode-contrastBorder': '#6fc3df',
  '--vscode-descriptionForeground': '#ffffff',
  '--vscode-focusBorder': '#f38518',
  '--vscode-charts-yellow': '#ffd370',
  '--vscode-testing-iconPassed': '#73c991',
  '--vscode-testing-iconFailed': '#f48771',
  '--vscode-disabledForeground': '#a5a5a5',
  '--vscode-errorForeground': '#f48771',
  '--vscode-charts-purple': '#b180d7',
  '--vscode-badge-background': '#000000',
  '--vscode-badge-foreground': '#ffffff'
};

const HC_COLORS: ExpectedThemeColors = {
  fill: 'rgb(0, 0, 0)',
  label: 'rgb(255, 255, 255)',
  frame: 'rgb(111, 195, 223)',
  edge: 'rgb(255, 255, 255)',
  selected: 'rgb(243, 133, 24)',
  selectedFill: 'rgb(0, 0, 0)'
};

export const THEME_HC_STUB: ThemeStub = { bodyClass: 'vscode-high-contrast', vars: HC_VARS, expected: HC_COLORS };

/**
 * VS Code 1.141's default dark theme, Dark 2026 (`theme-defaults/themes/2026-dark.json`; the testing icons from the colour
 * registry), as a webview receives it: opaque colours as `#rrggbb`, colours with alpha as `rgba()` to two places.
 */
const DARK_2026_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#121314',
  '--vscode-foreground': '#bfbfbf',
  '--vscode-panel-border': '#2a2b2c',
  '--vscode-widget-border': '#2a2b2c',
  '--vscode-descriptionForeground': '#8c8c8c',
  '--vscode-focusBorder': 'rgba(57, 148, 188, 0.7)',
  '--vscode-charts-yellow': '#e0b97f',
  '--vscode-testing-iconPassed': '#73c991',
  '--vscode-testing-iconFailed': '#f48771',
  '--vscode-disabledForeground': '#555555',
  '--vscode-errorForeground': '#f48771',
  '--vscode-charts-purple': '#ad80d7',
  '--vscode-badge-background': '#307e9f',
  '--vscode-badge-foreground': '#ffffff',
  '--vscode-list-activeSelectionBackground': 'rgba(255, 255, 255, 0.13)',
  '--vscode-list-activeSelectionForeground': '#ededed'
};

/** The selected fill is white at 0.13 over `#121314`; Cytoscape draws the focus border without its alpha. */
const DARK_2026_COLORS: ExpectedThemeColors = {
  fill: 'rgb(18, 19, 20)',
  label: 'rgb(191, 191, 191)',
  frame: 'rgb(42, 43, 44)',
  edge: 'rgb(140, 140, 140)',
  selected: 'rgb(57, 148, 188)',
  selectedFill: 'rgb(49, 50, 51)'
};

export const THEME_DARK_2026_STUB: ThemeStub = { bodyClass: 'vscode-dark', vars: DARK_2026_VARS, expected: DARK_2026_COLORS };

/** VS Code 1.141's default light theme, Light 2026 (`2026-light.json`), in the same webview form. */
const LIGHT_2026_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#ffffff',
  '--vscode-foreground': '#202020',
  '--vscode-panel-border': '#f0f1f2',
  '--vscode-widget-border': '#e2e2e5',
  '--vscode-descriptionForeground': '#606060',
  '--vscode-focusBorder': '#0069cc',
  '--vscode-charts-yellow': '#667309',
  '--vscode-testing-iconPassed': '#73c991',
  '--vscode-testing-iconFailed': '#ad0707',
  '--vscode-disabledForeground': '#bbbbbb',
  '--vscode-errorForeground': '#ad0707',
  '--vscode-charts-purple': '#652d90',
  '--vscode-badge-background': '#0069cc',
  '--vscode-badge-foreground': '#ffffff',
  '--vscode-list-activeSelectionBackground': 'rgba(0, 0, 0, 0.15)',
  '--vscode-list-activeSelectionForeground': '#202020'
};

/** The selected fill is black at 0.15 over white. */
const LIGHT_2026_COLORS: ExpectedThemeColors = {
  fill: 'rgb(255, 255, 255)',
  label: 'rgb(32, 32, 32)',
  frame: 'rgb(240, 241, 242)',
  edge: 'rgb(96, 96, 96)',
  selected: 'rgb(0, 105, 204)',
  selectedFill: 'rgb(217, 217, 217)'
};

export const THEME_LIGHT_2026_STUB: ThemeStub = { bodyClass: 'vscode-light', vars: LIGHT_2026_VARS, expected: LIGHT_2026_COLORS };
