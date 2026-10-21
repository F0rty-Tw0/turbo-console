import { FALLBACK_COLORS } from '../common/graph.const.ts';
import type { CssVariableReader, ThemeColors } from '../common/theme-colors.type.ts';

/**
 * The graph colours from the theme variables, each trimmed (`getPropertyValue` keeps the leading space), a blank one
 * replaced by its `FALLBACK_COLORS` entry. VS Code sets `--vscode-contrastBorder` only in high contrast themes, so the
 * node frame takes it there and `--vscode-panel-border` everywhere else.
 */
export const themeColorsOf = (read: CssVariableReader): ThemeColors => {
  const valueOf = (name: string, fallback: string): string => {
    const value = read(name).trim();

    return value === '' ? fallback : value;
  };
  const contrastBorder = valueOf('--vscode-contrastBorder', '');
  const panelBorder = valueOf('--vscode-panel-border', FALLBACK_COLORS.frame);
  const frame = contrastBorder === '' ? panelBorder : contrastBorder;
  const colors: ThemeColors = {
    background: valueOf('--vscode-editor-background', FALLBACK_COLORS.background),
    label: valueOf('--vscode-foreground', FALLBACK_COLORS.label),
    edge: valueOf('--vscode-descriptionForeground', FALLBACK_COLORS.edge),
    selected: valueOf('--vscode-focusBorder', FALLBACK_COLORS.selected),
    highlighted: valueOf('--vscode-charts-blue', FALLBACK_COLORS.highlighted),
    frame
  };

  return colors;
};
