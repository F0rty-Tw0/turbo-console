import { FALLBACK_COLORS } from '../../common/graph.const.ts';
import type { SelectionColors, ThemeColors } from '../../common/theme-colors.type.ts';

export const SELECTION_COLORS_STUB: SelectionColors = { fill: '#04395e', label: '#ffffff' };

/** The fallback colours with the list's selection fill and label set, as a theme with a selection has them. */
export const THEME_COLORS_STUB: ThemeColors = { ...FALLBACK_COLORS, selection: SELECTION_COLORS_STUB };
