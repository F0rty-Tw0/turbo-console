/** Dispatches a cancelable `keydown` of `key` aimed at `target` on `element`; `true` when a listener called `preventDefault`. */
export const pressKey = (element: HTMLElement, key: string, target: EventTarget | undefined): boolean => {
  const event = new Event('keydown', { cancelable: true });

  Object.defineProperty(event, 'key', { value: key });
  Object.defineProperty(event, 'target', { value: target });
  element.dispatchEvent(event);

  return event.defaultPrevented;
};
