import { logTextOf } from '../../shared/utils/log-text.util.ts';
import type { ExplainContext } from '../common/graph.type.ts';

/** The failure of a read is logged and counts as an unreadable file. */
export const textOf = async (context: ExplainContext, absolute: string): Promise<string | null> => {
  try {
    return await context.ports.readText(absolute);
  } catch (error: unknown) {
    context.ports.log(logTextOf(error));

    return null;
  }
};

/** Logs `Not a readable <what>: <absolute>`. */
export const logUnreadable = (context: ExplainContext, absolute: string, what: string): void => {
  context.ports.log(logTextOf(`Not a readable ${what}: ${absolute}`));
};

/**
 * Opens `absolute` at `line` once a read shows it is a small regular file; else logs `Not a readable <what>:
 * <absolute>`. A panel that can no longer post after the read opens nothing. Never rejects.
 */
export const openReadable = async (context: ExplainContext, absolute: string, line: number, what: string): Promise<void> => {
  const text = await textOf(context, absolute);

  if (text === null) {
    logUnreadable(context, absolute, what);

    return;
  }

  const canPost = context.canPost();

  if (!canPost) return;

  try {
    await context.ports.openAt(absolute, line);
  } catch (error: unknown) {
    context.ports.log(logTextOf(error));
  }
};
