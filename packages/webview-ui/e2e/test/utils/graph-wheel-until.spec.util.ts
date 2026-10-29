/** The most notches `wheelUntil` wheels before it gives up: a slow runner gets the same budget as a fast one. */
const MAX_ZOOM_NOTCHES = 60;

/** Wheels one notch at a time until `isReached` holds; throws with the zoom it stopped at, so a slow runner fails on the notch budget, not on a wall-clock timeout. */
export const wheelUntil = async (
  wheelOnce: () => Promise<void>,
  isReached: () => Promise<boolean>,
  readZoom: () => Promise<number>
): Promise<void> => {
  for (let notch = 0; notch < MAX_ZOOM_NOTCHES; notch += 1) {
    if (await isReached()) return;

    await wheelOnce();
  }

  if (await isReached()) return;

  const zoom = await readZoom();

  throw new Error(`graph e2e: ${MAX_ZOOM_NOTCHES} wheel notches did not reach the zoom wanted; stopped at zoom ${zoom}`);
};
