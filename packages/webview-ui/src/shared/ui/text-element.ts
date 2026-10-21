/** An element whose text is set through `textContent`, the only way repo text reaches the page (spec 1b D3). */
export const textElement = <TTag extends keyof HTMLElementTagNameMap>(
  tag: TTag,
  className: string,
  text: string
): HTMLElementTagNameMap[TTag] => {
  const element = document.createElement(tag);

  element.className = className;
  element.textContent = text;

  return element;
};
