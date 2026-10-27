import { hexChannelsOf } from './colour-parse.util.ts';
import { dimmedOpacityOf, opaqueColourOf } from './contrast.util.ts';
import { FALLBACK_COLORS } from '../common/graph.const.ts';
import type { CssVariableReader, SelectionColors, ThemeColors } from '../common/theme-colors.type.ts';

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
 * The list's active selection as a selected node's fill and label; `null` unless the theme sets both. A fill with alpha,
 * as Dark 2026 and Light 2026 set, is laid over `background` first, since Cytoscape would paint it opaque.
 */
const selectionOf = (fill: string, label: string, background: string): SelectionColors | null => {
  const isUnset = fill === '' || label === '';

  if (isUnset) return null;

  const opaqueFill = opaqueColourOf(fill, background);
  const selection: SelectionColors = { fill: cytoscapeColourOf(opaqueFill), label };

  return selection;
};

/**
 * The graph colours from the theme variables, each trimmed (`getPropertyValue` keeps the leading space), a blank one
 * replaced by its `FALLBACK_COLORS` entry. VS Code sets `--vscode-contrastBorder` only in high contrast themes, so the
 * node frame takes it there and `--vscode-panel-border` everywhere else, and dimmed elements rise from 0.25 until they keep
 * 3:1 against the background there. Run outlines take the Tasks tree's status colours; a cached Atomizer file takes the chart purple.
 * A selected node takes the list's active selection colours when the theme sets both, as high contrast themes do not;
 * the fill is read unrounded, so its alpha blends over the editor background at full precision.
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
    continuous: valueOf('--vscode-charts-green', fallbackRuns.continuous),
    passed: valueOf('--vscode-testing-iconPassed', fallbackRuns.passed),
    failed: valueOf('--vscode-testing-iconFailed', fallbackRuns.failed),
    stopped: valueOf('--vscode-descriptionForeground', fallbackRuns.stopped),
    'failed-to-start': valueOf('--vscode-errorForeground', fallbackRuns['failed-to-start'])
  };
  const background = valueOf('--vscode-editor-background', FALLBACK_COLORS.background);
  const label = valueOf('--vscode-foreground', FALLBACK_COLORS.label);
  const edge = valueOf('--vscode-descriptionForeground', FALLBACK_COLORS.edge);
  const highContrastDim = dimmedOpacityOf(background, [label, edge, frame]);
  const dimmedOpacity = contrastBorder === '' ? FALLBACK_COLORS.dimmedOpacity : highContrastDim;
  const selectionFill = read('--vscode-list-activeSelectionBackground').trim();
  const selectionLabel = valueOf('--vscode-list-activeSelectionForeground', '');
  const selection = selectionOf(selectionFill, selectionLabel, background);
  const colors: ThemeColors = {
    background,
    label,
    edge,
    selected: valueOf('--vscode-focusBorder', FALLBACK_COLORS.selected),
    highlighted: valueOf('--vscode-charts-blue', FALLBACK_COLORS.highlighted),
    frame,
    cached: valueOf('--vscode-charts-purple', FALLBACK_COLORS.cached),
    runs,
    selection,
    dimmedOpacity
  };

  return colors;
};
