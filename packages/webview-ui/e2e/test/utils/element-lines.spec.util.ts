/**
 * Runs in the page through `evaluateAll`: how many lines of text each match shows, one per box its contents lay out in.
 * Only its own source reaches the page, so it calls nothing outside itself.
 */
export const readLineCounts = (elements: Element[]): number[] => {
  const counts = elements.map((element): number => {
    const range = document.createRange();

    range.selectNodeContents(element);

    const lines = range.getClientRects().length;

    return lines;
  });

  return counts;
};
