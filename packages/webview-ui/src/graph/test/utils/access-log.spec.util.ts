const STYLE_KEYS = ['transform', 'width'];

const LAYOUT_READS = ['offsetLeft', 'offsetTop', 'offsetWidth', 'offsetHeight'];

/** Replaces `key` of `target` with an accessor that logs each write and still holds the value. */
const logWritesTo = (target: object, key: string, label: string, log: string[]): void => {
  let current: unknown = Reflect.get(target, key);

  Object.defineProperty(target, key, {
    get: (): unknown => current,
    set: (value: unknown): void => {
      current = value;
      log.push(`write ${label}`);
    }
  });
};

/** Replaces `key` of `target` with an accessor that logs each read of the value it held. */
const logReadsOf = (target: object, key: string, label: string, log: string[]): void => {
  const value: unknown = Reflect.get(target, key);

  Object.defineProperty(target, key, {
    get: (): unknown => {
      log.push(`read ${label}`);

      return value;
    }
  });
};

const logElement = (element: HTMLElement, index: number, log: string[]): void => {
  const rect = element.getBoundingClientRect();

  logWritesTo(element, 'tabIndex', `#${index} tabIndex`, log);
  logWritesTo(element, 'hidden', `#${index} hidden`, log);

  for (const key of STYLE_KEYS) logWritesTo(element.style, key, `#${index} style.${key}`, log);

  for (const key of LAYOUT_READS) logReadsOf(element, key, `#${index} ${key}`, log);

  Object.defineProperty(element, 'getBoundingClientRect', {
    value: (): DOMRect => {
      log.push(`read #${index} getBoundingClientRect`);

      return rect;
    }
  });
};

/**
 * From now on, the log gets one entry for each write to an element's tabIndex, hidden, inline transform or width and
 * each layout read (`offset*`, `getBoundingClientRect`), so a spec asserts a repeat pass left the DOM alone. Entries
 * name the element by its index in `elements`; a `null` slot is skipped.
 */
export const accessLogOf = (elements: (HTMLElement | null)[]): string[] => {
  const log: string[] = [];

  elements.forEach((element, index): void => {
    if (element !== null) logElement(element, index, log);
  });

  return log;
};
