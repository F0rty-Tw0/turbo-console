/**
 * The few DOM calls the graph's element builders make, for specs that run without a DOM: attributes, classes,
 * children and plain properties. An input's `value` follows `defaultValue` until it is set.
 */
class FakeElement {
  public readonly tagName: string;
  public readonly children: FakeElement[] = [];
  public className = '';
  public textContent = '';
  public id = '';
  public type = '';
  public title = '';
  public hidden = false;
  public disabled = false;
  public tabIndex = 0;
  public min = '';
  public max = '';
  public step = '';
  public defaultValue = '';
  public autocomplete = '';
  public spellcheck = true;
  public readonly classList = {
    add: (...names: string[]): void => {
      const all = [this.className, ...names];
      const joined = all.join(' ');

      this.className = joined.trim();
    }
  };

  private readonly attributes = new Map<string, string>();
  private typed: string | null = null;

  public constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }

  public get value(): string {
    return this.typed ?? this.defaultValue;
  }

  public set value(text: string) {
    this.typed = text;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }

  public prepend(...nodes: FakeElement[]): void {
    this.children.unshift(...nodes);
  }
}

type FakeDocument = {
  readonly createElement: (tag: string) => FakeElement;
};

/** A `document` for `vi.stubGlobal('document', …)`: `createElement` only. */
export const fakeDocumentMock = (): FakeDocument => {
  const fake: FakeDocument = { createElement: (tag: string): FakeElement => new FakeElement(tag) };

  return fake;
};
