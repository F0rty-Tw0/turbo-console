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

/** The list's active selection as a selected node's fill and label; `null` unless the theme sets both. */
const selectionOf = (fill: string, label: string): SelectionColors | null => {
  const isUnset = fill === '' || label === '';

  if (isUnset) return null;

  const selection: SelectionColors = { fill, label };

  return selection;
};

/** The variable `name`, or `fallback` when blank, read unrounded and laid over `background` as an opaque colour. */
const opaqueVariableOf = (read: CssVariableReader, name: string, fallback: string, background: string): string => {
  const value = read(name).trim() || fallback;
  const opaque = opaqueColourOf(value, background);

  return cytoscapeColourOf(opaque);
};

/**
 * The graph colours from the theme variables, each trimmed (`getPropertyValue` keeps the leading space), a blank one
 * replaced by its `FALLBACK_COLORS` entry. Cytoscape 3.35 draws a colour's alpha, but the graph keeps the theme's opaque
 * look, as VS Code itself shows it: every colour but the editor background is read unrounded and laid over it.
 * VS Code sets `--vscode-contrastBorder` only in high contrast themes, so the node frame and the card frame take it there
 * and `--vscode-panel-border` and `--vscode-input-border` everywhere else, and dimmed elements rise from 0.25 until they
 * keep 3:1 against the background there. Run outlines take the Tasks tree's status colours; a cached Atomizer file takes
 * the chart purple; the affected halo takes the git modified colour. A selected node takes the list's active selection
 * colours when the theme sets both, as high contrast themes do not.
 */
export const themeColorsOf = (read: CssVariableReader): ThemeColors => {
  const editorBackground = read('--vscode-editor-background').trim() || FALLBACK_COLORS.background;
  const background = cytoscapeColourOf(editorBackground);
  const opaqueValueOf = (name: string, fallback: string): string => opaqueVariableOf(read, name, fallback, background);
  const contrastBorder = opaqueValueOf('--vscode-contrastBorder', '');
  const panelBorder = opaqueValueOf('--vscode-panel-border', FALLBACK_COLORS.frame);
  const frame = contrastBorder === '' ? panelBorder : contrastBorder;
  const fallbackRuns = FALLBACK_COLORS.runs;
  const runs: ThemeColors['runs'] = {
    running: opaqueValueOf('--vscode-charts-yellow', fallbackRuns.running),
    continuous: opaqueValueOf('--vscode-charts-green', fallbackRuns.continuous),
    passed: opaqueValueOf('--vscode-testing-iconPassed', fallbackRuns.passed),
    failed: opaqueValueOf('--vscode-testing-iconFailed', fallbackRuns.failed),
    stopped: opaqueValueOf('--vscode-descriptionForeground', fallbackRuns.stopped),
    'failed-to-start': opaqueValueOf('--vscode-errorForeground', fallbackRuns['failed-to-start'])
  };
  const label = opaqueValueOf('--vscode-foreground', FALLBACK_COLORS.label);
  const edge = opaqueValueOf('--vscode-descriptionForeground', FALLBACK_COLORS.edge);
  const highContrastDim = dimmedOpacityOf(background, [label, edge, frame]);
  const dimmedOpacity = contrastBorder === '' ? FALLBACK_COLORS.dimmedOpacity : highContrastDim;
  const selectionFill = opaqueValueOf('--vscode-list-activeSelectionBackground', '');
  const selectionLabel = opaqueValueOf('--vscode-list-activeSelectionForeground', '');
  const selection = selectionOf(selectionFill, selectionLabel);
  const cardFill = opaqueValueOf('--vscode-input-background', background);
  const inputBorder = opaqueValueOf('--vscode-input-border', frame);
  const cardFrame = contrastBorder === '' ? inputBorder : contrastBorder;
  const colors: ThemeColors = {
    background,
    label,
    edge,
    selected: opaqueValueOf('--vscode-focusBorder', FALLBACK_COLORS.selected),
    highlighted: opaqueValueOf('--vscode-charts-blue', FALLBACK_COLORS.highlighted),
    frame,
    cached: opaqueValueOf('--vscode-charts-purple', FALLBACK_COLORS.cached),
    runs,
    selection,
    dimmedOpacity,
    affected: opaqueValueOf('--vscode-gitDecoration-modifiedResourceForeground', FALLBACK_COLORS.affected),
    cardFill,
    cardFrame
  };

  return colors;
};
