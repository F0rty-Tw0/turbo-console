import type { PackageNode } from '@turbo-console/core';

import type { PackageScripts, ToolMatch } from '../common/tool.type.ts';

const ROOT_PACKAGE = '//';
const VIA_SEPARATOR = ' → ';

/** The scripts a delegation may follow in `pkg`: the commands by task name, and whether D2 lets `turbo X` follow. */
export const packageScriptsOf = (pkg: PackageNode, singlePackage: boolean): PackageScripts => {
  const entries: [string, string][] = [];

  for (const task of pkg.tasks) {
    if (task.command !== null) entries.push([task.name, task.command]);
  }

  const followTurbo = pkg.name !== ROOT_PACKAGE || singlePackage;
  const scripts: PackageScripts = { bodies: new Map(entries), followTurbo };

  return scripts;
};

/** `Vitest`, or `Vitest (via a → b)` when the tool was reached through scripts. */
export const toolTitleOf = (match: ToolMatch): string => {
  if (match.via.length === 0) return match.tool.title;

  return `${match.tool.title} (via ${match.via.join(VIA_SEPARATOR)})`;
};
