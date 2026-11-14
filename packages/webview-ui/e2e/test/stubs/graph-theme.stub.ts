import type { ExpectedThemeColors, ThemeStub } from '../../common/graph-theme.type.ts';

/** `--vscode-input-*` from https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes/dark_modern.json, fetched 2026-11-13. */
const DARK_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#1f1f1f',
  '--vscode-foreground': '#cccccc',
  '--vscode-panel-border': '#2b2b2b',
  '--vscode-widget-border': '#313131',
  '--vscode-descriptionForeground': '#9d9d9d',
  '--vscode-focusBorder': '#0078d4',
  '--vscode-charts-yellow': '#cca700',
  '--vscode-charts-green': '#89d185',
  '--vscode-testing-iconPassed': '#73c991',
  '--vscode-testing-iconFailed': '#f14c4c',
  '--vscode-disabledForeground': '#cccccc80',
  '--vscode-errorForeground': '#f85149',
  '--vscode-charts-purple': '#b180d7',
  '--vscode-badge-background': '#616161',
  '--vscode-badge-foreground': '#f8f8f8',
  '--vscode-list-activeSelectionBackground': '#04395e',
  '--vscode-list-activeSelectionForeground': '#ffffff',
  '--vscode-input-background': '#313131',
  '--vscode-input-border': '#3c3c3c'
};

const DARK_COLORS: ExpectedThemeColors = {
  fill: 'rgb(31, 31, 31)',
  label: 'rgb(204, 204, 204)',
  frame: 'rgb(43, 43, 43)',
  edge: 'rgb(157, 157, 157)',
  selected: 'rgb(0, 120, 212)',
  selectedFill: 'rgb(4, 57, 94)',
  cardFill: 'rgb(49, 49, 49)',
  cardFrame: 'rgb(60, 60, 60)'
};

export const THEME_DARK_STUB: ThemeStub = { bodyClass: 'vscode-dark', vars: DARK_VARS, expected: DARK_COLORS };

/** `--vscode-input-*` from https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes/light_modern.json, fetched 2026-11-13. */
const LIGHT_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#ffffff',
  '--vscode-foreground': '#3b3b3b',
  '--vscode-panel-border': '#e5e5e5',
  '--vscode-widget-border': '#e5e5e5',
  '--vscode-descriptionForeground': '#3b3b3b',
  '--vscode-focusBorder': '#005fb8',
  '--vscode-charts-yellow': '#bf8803',
  '--vscode-charts-green': '#388a34',
  '--vscode-testing-iconPassed': '#388a34',
  '--vscode-testing-iconFailed': '#f14c4c',
  '--vscode-disabledForeground': '#61616180',
  '--vscode-errorForeground': '#f85149',
  '--vscode-charts-purple': '#652d90',
  '--vscode-badge-background': '#cccccc',
  '--vscode-badge-foreground': '#3b3b3b',
  '--vscode-list-activeSelectionBackground': '#e8e8e8',
  '--vscode-list-activeSelectionForeground': '#000000',
  '--vscode-input-background': '#ffffff',
  '--vscode-input-border': '#cecece'
};

const LIGHT_COLORS: ExpectedThemeColors = {
  fill: 'rgb(255, 255, 255)',
  label: 'rgb(59, 59, 59)',
  frame: 'rgb(229, 229, 229)',
  edge: 'rgb(59, 59, 59)',
  selected: 'rgb(0, 95, 184)',
  selectedFill: 'rgb(232, 232, 232)',
  cardFill: 'rgb(255, 255, 255)',
  cardFrame: 'rgb(206, 206, 206)'
};

export const THEME_LIGHT_STUB: ThemeStub = { bodyClass: 'vscode-light', vars: LIGHT_VARS, expected: LIGHT_COLORS };

/**
 * `--vscode-input-*` are the hcDark defaults of https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/platform/theme/common/colors/inputColors.ts
 * (`input.background` black, `input.border` the contrast border; `hc_black.json` sets neither), fetched 2026-11-13.
 * `--vscode-panel-border` is set too, and must lose to `--vscode-contrastBorder`; no list selection colours, as VS Code's High Contrast sets none. */
const HC_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#000000',
  '--vscode-foreground': '#ffffff',
  '--vscode-panel-border': '#808080',
  '--vscode-contrastBorder': '#6fc3df',
  '--vscode-descriptionForeground': '#ffffff',
  '--vscode-focusBorder': '#f38518',
  '--vscode-charts-yellow': '#ffd370',
  '--vscode-charts-green': '#89d185',
  '--vscode-testing-iconPassed': '#73c991',
  '--vscode-testing-iconFailed': '#f48771',
  '--vscode-disabledForeground': '#a5a5a5',
  '--vscode-errorForeground': '#f48771',
  '--vscode-charts-purple': '#b180d7',
  '--vscode-badge-background': '#000000',
  '--vscode-badge-foreground': '#ffffff',
  '--vscode-input-background': '#000000',
  '--vscode-input-border': '#6fc3df'
};

const HC_COLORS: ExpectedThemeColors = {
  fill: 'rgb(0, 0, 0)',
  label: 'rgb(255, 255, 255)',
  frame: 'rgb(111, 195, 223)',
  edge: 'rgb(255, 255, 255)',
  selected: 'rgb(243, 133, 24)',
  selectedFill: 'rgb(0, 0, 0)',
  cardFill: 'rgb(0, 0, 0)',
  cardFrame: 'rgb(111, 195, 223)'
};

export const THEME_HC_STUB: ThemeStub = { bodyClass: 'vscode-high-contrast', vars: HC_VARS, expected: HC_COLORS };
