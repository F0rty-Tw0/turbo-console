import type { ExpectedThemeColors, ThemeStub } from '../../common/graph.type.ts';

const DARK_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#1f1f1f',
  '--vscode-foreground': '#cccccc',
  '--vscode-panel-border': '#2b2b2b',
  '--vscode-descriptionForeground': '#9d9d9d',
  '--vscode-focusBorder': '#0078d4'
};

const DARK_COLORS: ExpectedThemeColors = {
  fill: 'rgb(31, 31, 31)',
  label: 'rgb(204, 204, 204)',
  frame: 'rgb(43, 43, 43)',
  edge: 'rgb(157, 157, 157)',
  selected: 'rgb(0, 120, 212)'
};

export const THEME_DARK_STUB: ThemeStub = { bodyClass: 'vscode-dark', vars: DARK_VARS, expected: DARK_COLORS };

const LIGHT_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#ffffff',
  '--vscode-foreground': '#3b3b3b',
  '--vscode-panel-border': '#e5e5e5',
  '--vscode-descriptionForeground': '#616161',
  '--vscode-focusBorder': '#005fb8'
};

const LIGHT_COLORS: ExpectedThemeColors = {
  fill: 'rgb(255, 255, 255)',
  label: 'rgb(59, 59, 59)',
  frame: 'rgb(229, 229, 229)',
  edge: 'rgb(97, 97, 97)',
  selected: 'rgb(0, 95, 184)'
};

export const THEME_LIGHT_STUB: ThemeStub = { bodyClass: 'vscode-light', vars: LIGHT_VARS, expected: LIGHT_COLORS };

/** `--vscode-panel-border` is set too, and must lose to `--vscode-contrastBorder`. */
const HC_VARS: Readonly<Record<string, string>> = {
  '--vscode-editor-background': '#000000',
  '--vscode-foreground': '#ffffff',
  '--vscode-panel-border': '#808080',
  '--vscode-contrastBorder': '#6fc3df',
  '--vscode-descriptionForeground': '#ffffff',
  '--vscode-focusBorder': '#f38518'
};

const HC_COLORS: ExpectedThemeColors = {
  fill: 'rgb(0, 0, 0)',
  label: 'rgb(255, 255, 255)',
  frame: 'rgb(111, 195, 223)',
  edge: 'rgb(255, 255, 255)',
  selected: 'rgb(243, 133, 24)'
};

export const THEME_HC_STUB: ThemeStub = { bodyClass: 'vscode-high-contrast', vars: HC_VARS, expected: HC_COLORS };
