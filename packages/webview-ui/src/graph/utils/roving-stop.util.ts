/** A widget's one Tab stop: `preferred` while shown, else the first shown button; `fallback` when none is. */
export const stopOf = <TKind extends string>(preferred: TKind, shown: TKind[], fallback: TKind): TKind => {
  const isPreferredShown = shown.includes(preferred);

  if (isPreferredShown) return preferred;

  return shown[0] ?? fallback;
};

/** The kind in `order` whose button `target` is, `undefined` when it is none of them; a `null` target is none, though a missing button is `null` too. */
export const kindIn = <TKind extends string>(
  order: TKind[],
  buttons: Readonly<Record<TKind, EventTarget | null>>,
  target: EventTarget | null
): TKind | undefined => {
  if (target === null) return undefined;

  return order.find((kind) => buttons[kind] === target);
};
