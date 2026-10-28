import type { RunEntry } from '../../run/common/run.type.ts';
import type { ToolMatch } from '../../tool/common/tool.type.ts';
import { toolIconIdOf } from '../../tool/utils/tool-of.util.ts';
import { IDLE_ICON } from '../common/icon.const.ts';
import type { IconSpec, TaskDisplay, TreeRow } from '../common/tree-row.type.ts';

/** Only the idle wrench gives way to the tool: a run entry, a continuous task and a kind icon all win over it. */
const isIdleWrench = (display: TaskDisplay, entry: RunEntry | undefined): boolean => {
  const isIdle = entry === undefined;
  const isWrench = display.icon.id === IDLE_ICON.id;

  return isIdle && isWrench;
};

const iconIdOfTool = (match: ToolMatch | null): string | null => {
  if (match === null) return null;

  return toolIconIdOf(match.tool);
};

/** Spec 1c-c §4.6: the lowest rung. Only the idle wrench gives way to the tool's logo; run state and kind icons win. */
export const toolIcon = (display: TaskDisplay, entry: RunEntry | undefined, match: ToolMatch | null): IconSpec => {
  const iconId = iconIdOfTool(match);
  const isIdle = isIdleWrench(display, entry);

  if (!isIdle || iconId === null) return display.icon;

  const icon: IconSpec = { id: iconId, color: null };

  return icon;
};

const NO_THEME_FILES: Pick<TreeRow, 'themeFiles'> = {};

/** The row's `themeFiles` field: the tool's config file names on the idle-wrench rung, else no field at all, so other rows keep today's shape (UB6). */
export const themeFilesOf = (
  display: TaskDisplay,
  entry: RunEntry | undefined,
  match: ToolMatch | null
): Pick<TreeRow, 'themeFiles'> => {
  if (match === null) return NO_THEME_FILES;

  const isIdle = isIdleWrench(display, entry);
  const { configFiles } = match.tool;

  if (!isIdle || configFiles.length === 0) return NO_THEME_FILES;

  const themed: Pick<TreeRow, 'themeFiles'> = { themeFiles: configFiles };

  return themed;
};
