const PNG_BYTES: number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3];

/** An `exportImage` payload: the 8-byte PNG signature then bytes 1, 2, 3, as base64. */
export const PNG_STUB: string = Buffer.from(PNG_BYTES).toString('base64');
