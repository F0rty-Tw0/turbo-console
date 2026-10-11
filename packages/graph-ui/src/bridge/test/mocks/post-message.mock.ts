import type { Mock } from 'vitest';
import { vi } from 'vitest';

import type { PostMessage } from '../../common/bridge.type.ts';

export const postMessageMock = (): Mock<PostMessage> => vi.fn<PostMessage>();
