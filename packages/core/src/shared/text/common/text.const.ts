/** A leading U+FEFF that some editors write at the start of a text file; `readSmallFile` keeps it. */
export const BYTE_ORDER_MARK = /^\uFEFF/;
