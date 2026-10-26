const loadedOf = async (load: () => Promise<unknown[]>): Promise<boolean> => {
  try {
    const faces = await load();

    return faces.length > 0;
  } catch {
    return false;
  }
};

/** Whether the codicon font loaded a face before `timeoutMs`; a rejected load, an empty load or a timeout is `false`. Never rejects. */
export const codiconReadyOf = async (
  load: () => Promise<unknown[]>,
  timeoutMs: number,
  after: (run: () => void, ms: number) => void
): Promise<boolean> => {
  const loaded = loadedOf(load);
  const timedOut = new Promise<boolean>((resolve) => after(() => resolve(false), timeoutMs));
  const ready = await Promise.race([loaded, timedOut]);

  return ready;
};
