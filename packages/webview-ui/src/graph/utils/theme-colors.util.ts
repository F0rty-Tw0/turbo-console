import { dimmedOpacityOf, hexChannelsOf } from './contrast.util.ts';
import { FALLBACK_COLORS } from '../common/graph.const.ts';
import type { CssVariableReader, ThemeColors } from '../common/theme-colors.type.ts';

/** `#rgba` or `#rrggbbaa`: a hex colour with alpha, which Cytoscape rejects. */
const ALPHA_HEX = /^#(?:[\da-f]{4}|[\da-f]{8})$/iu;

/** A hex colour with alpha as the `rgba()` Cytoscape parses, the alpha to two places; any other value is kept. */
const cytoscapeColourOf = (value: string): string => {
  const isAlphaHex = ALPHA_HEX.test(value);

  if (!isAlphaHex) return value;

  const [red, green, blue, alpha = 255] = hexChannelsOf(value);
  const opacity = Math.round((alpha / 255) * 100) / 100;

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

/**
 * The graph colours from the theme variables, each trimmed (`getPropertyValue` keeps the leading space), a blank one
 * replaced by its `FALLBACK_COLORS` entry. VS Code sets `--vscode-contrastBorder` only in high contrast themes, so the
 * node frame takes it there and `--vscode-panel-border` everywhere else, and dimmed elements rise from 0.25 until they keep
 * 3:1 against the background there. Run outlines take the Tasks tree's status colours.
 */
export const themeColorsOf = (read: CssVariableReader): ThemeColors => {
  const valueOf = (name: string, fallback: string): string => {
    const value = read(name).trim();

    if (value === '') return fallback;

    return cytoscapeColourOf(value);
  };
  const contrastBorder = valueOf('--vscode-contrastBorder', '');
  const panelBorder = valueOf('--vscode-panel-border', FALLBACK_COLORS.frame);
  const frame = contrastBorder === '' ? panelBorder : contrastBorder;
  const fallbackRuns = FALLBACK_COLORS.runs;
  const runs: ThemeColors['runs'] = {
    running: valueOf('--vscode-charts-yellow', fallbackRuns.running),
    passed: valueOf('--vscode-testing-iconPassed', fallbackRuns.passed),
    failed: valueOf('--vscode-testing-iconFailed', fallbackRuns.failed),
    stopped: valueOf('--vscode-disabledForeground', fallbackRuns.stopped),
    'failed-to-start': valueOf('--vscode-errorForeground', fallbackRuns['failed-to-start'])
  };
  const background = valueOf('--vscode-editor-background', FALLBACK_COLORS.background);
  const label = valueOf('--vscode-foreground', FALLBACK_COLORS.label);
  const edge = valueOf('--vscode-descriptionForeground', FALLBACK_COLORS.edge);
  const highContrastDim = dimmedOpacityOf(background, [label, edge, frame]);
  const dimmedOpacity = contrastBorder === '' ? FALLBACK_COLORS.dimmedOpacity : highContrastDim;
  const colors: ThemeColors = {
    background,
    label,
    edge,
    selected: valueOf('--vscode-focusBorder', FALLBACK_COLORS.selected),
    highlighted: valueOf('--vscode-charts-blue', FALLBACK_COLORS.highlighted),
    frame,
    runs,
    dimmedOpacity
  };

  return colors;
};
