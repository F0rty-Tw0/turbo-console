import { PANEL_ID_SEPARATOR } from '../common/details.const.ts';
import type { PanelKey } from '../common/details.type.ts';

/** The registry key of a panel: a root and a package name, joined by a character neither can hold. */
export const panelIdOf = (key: PanelKey): string => `${key.root}${PANEL_ID_SEPARATOR}${key.packageName}`;
