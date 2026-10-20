import { vi } from 'vitest';

import type { ToolLookup, ToolResolver } from '../../../tool/common/tool.type.ts';
import { packageScriptsOf } from '../../../tool/utils/package-scripts.util.ts';
import { resolveTool } from '../../../tool/utils/tool-of.util.ts';

const resolveLookup: ToolLookup = (pkg, singlePackage, command) => resolveTool(command, packageScriptsOf(pkg, singlePackage));

/** The real lookup: `resolveTool` over the scripts of the package it is asked about. */
export const resolveLookupMock = (): ToolLookup => resolveLookup;

/** `resolveTool` behind a spy, so a spec counts how often the resolution runs. */
export const toolResolverMock = (): ToolResolver => vi.fn(resolveTool);

/** The real lookup behind a spy, so a spec sees which package, mode and command a row asks for. */
export const toolLookupMock = (): ToolLookup => vi.fn<ToolLookup>(resolveLookup);
