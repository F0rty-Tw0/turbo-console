/** The message `pending` rejects with, or `null` when it resolves. */
export const rejectionOf = async (pending: Promise<unknown>): Promise<string | null> => {
  try {
    await pending;
  } catch (error: unknown) {
    if (error instanceof Error) return error.message;

    return String(error);
  }

  return null;
};
