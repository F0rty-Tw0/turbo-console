import type { RunLogEvent } from '@turbo-console/core';

export const SEEN_UI: RunLogEvent = { kind: 'seen', taskId: 'ui#build' };
