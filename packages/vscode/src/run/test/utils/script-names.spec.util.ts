const ALLOWLIST = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@/._:=+-';

const METACHARACTERS = ' ;&|<>()$`"\'\\!%^*?[~';

const ALPHABET = ALLOWLIST + METACHARACTERS;

const NAME_COUNT = 2000;

const MAX_NAME_LENGTH = 12;

const SEED = 20_251_016;

const mixed = (name: number, slot: number): number => {
  const first = Math.imul(name ^ SEED, 1_664_525) + Math.imul(slot + 1, 1_013_904_223);
  const second = Math.imul(first >>> 0, 22_695_477) + 1;

  return (second >>> 8) % 0xff_ffff;
};

const charOf = (name: number, slot: number): string => ALPHABET.charAt(mixed(name, slot) % ALPHABET.length);

const nameOf = (name: number): string => {
  const length = 1 + (mixed(name, 0) % MAX_NAME_LENGTH);
  const chars = Array.from({ length }, (_char, slot) => charOf(name, slot + 1));

  return chars.join('');
};

/** 2000 reproducible strings over the name allowlist plus 20 shell metacharacters, one to twelve characters each. */
export const seededScriptNames = (): string[] => Array.from({ length: NAME_COUNT }, (_name, index) => nameOf(index));
