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

/**
 * Opens `absolute` at `line` once a read shows it is a small regular file; else logs `Not a readable <what>:
 * <absolute>`. Never rejects.
 */
export const openReadable = async (context: ExplainContext, absolute: string, line: number, what: string): Promise<void> => {
  const text = await textOf(context, absolute);

  if (text === null) {
    context.ports.log(logTextOf(`Not a readable ${what}: ${absolute}`));

    return;
  }

  try {
    await context.ports.openAt(absolute, line);
  } catch (error: unknown) {
    context.ports.log(logTextOf(error));
  }
};
