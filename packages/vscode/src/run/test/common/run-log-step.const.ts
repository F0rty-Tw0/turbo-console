/** Compact objects as turbo writes them; B's text holds braces and escaped quotes. */
export const ENTRY_A = '{"source":"a#build","level":"info","timestamp":1,"text":"one"}';

export const ENTRY_B = '{"source":"b#build","level":"info","timestamp":1,"text":"two {\\"q\\":\\"}\\"}"}';

export const ENTRY_C = '{"source":"c#build","level":"info","timestamp":1,"text":"three"}';

export const ENTRY_LINT = '{"source":"//#lint","level":"info","timestamp":1,"text":"four"}';

export const INVALID_OBJECT = '{"x":1}';

/** An object cut inside a string: it never closes on its line. */
export const BROKEN_OBJECT = '{"source":"a#b","text":"unterminated';
