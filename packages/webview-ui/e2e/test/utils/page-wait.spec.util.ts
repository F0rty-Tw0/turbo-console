/** Runs in the page through `page.evaluate`: resolves after `ms` of the page's own clock. */
export const waitInPage = async (ms: number): Promise<void> => new Promise((done): void => void setTimeout(done, ms));
