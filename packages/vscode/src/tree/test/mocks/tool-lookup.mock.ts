import { vi } from 'vitest';

import type { ToolLookup } from '../../../tool/common/tool.type.ts';
import { toolOf } from '../../../tool/utils/tool-of.util.ts';

/** `toolOf` behind a spy, so a spec counts how often the detection runs. */
export const toolLookupMock = (): ToolLookup => vi.fn(toolOf);
