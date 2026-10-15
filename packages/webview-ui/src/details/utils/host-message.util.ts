import type { HostMessage } from '../../bridge/common/details-message.type.ts';

type UnknownRecord = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null;

const isRunStateMessage = (message: UnknownRecord): boolean => {
  const hasTaskId = typeof message['taskId'] === 'string';

  return hasTaskId && isRecord(message['run']);
};

/**
 * Narrows a posted value to the messages the page handles, by `type` and the payload's top-level shape. Anything else
 * is ignored. The payload itself comes from the extension host, which builds it.
 */
export const isHostMessage = (value: unknown): value is HostMessage => {
  if (!isRecord(value)) return false;

  if (value['type'] === 'state') return isRecord(value['state']);

  if (value['type'] === 'runState') return isRunStateMessage(value);

  return false;
};
