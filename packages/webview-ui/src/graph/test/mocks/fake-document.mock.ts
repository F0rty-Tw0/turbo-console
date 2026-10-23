type FakeListener = () => void;

type FakeFocus = {
  element: FakeElement | null;
};

/**
 * The few DOM calls the graph's element builders make, for specs that run without a DOM: attributes, classes,
 * children, plain properties, click listeners and focus. An input's `value` follows `defaultValue` until it is set.
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
  public parent: FakeElement | null = null;
  public readonly classList = {
    add: (...names: string[]): void => {
      const all = [this.className, ...names];
      const joined = all.join(' ');

      this.className = joined.trim();
    }
  };

  private readonly attributes = new Map<string, string>();
  private readonly listeners: FakeListener[] = [];
  private readonly focused: FakeFocus;
  private typed: string | null = null;

  public constructor(tag: string, focus: FakeFocus) {
    this.tagName = tag.toUpperCase();
    this.focused = focus;
  }

  public get value(): string {
    return this.typed ?? this.defaultValue;
  }

  public set value(text: string) {
    this.typed = text;
  }

  public get isConnected(): boolean {
    return this.parent !== null;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public append(...nodes: FakeElement[]): void {
    for (const node of nodes) node.parent = this;

    this.children.push(...nodes);
  }

  public prepend(...nodes: FakeElement[]): void {
    for (const node of nodes) node.parent = this;

    this.children.unshift(...nodes);
  }

  public replaceChildren(...nodes: FakeElement[]): void {
    for (const child of this.children) child.parent = null;

    this.children.length = 0;
    this.append(...nodes);
  }

  public contains(node: FakeElement | null): boolean {
    if (node === null) return false;

    if (node === this) return true;

    return this.contains(node.parent);
  }

  /** Click listeners only: every one runs on `click()`, whatever event type it was added for. */
  public addEventListener(_type: string, listener: FakeListener): void {
    this.listeners.push(listener);
  }

  public click(): void {
    for (const listener of this.listeners) listener();
  }

  public focus(): void {
    this.focused.element = this;
  }
}

type FakeDocument = {
  readonly createElement: (tag: string) => FakeElement;
  readonly activeElement: FakeElement | null;
};

/** A `document` for `vi.stubGlobal('document', …)`: `createElement` and the element `focus()` last moved to. */
export const fakeDocumentMock = (): FakeDocument => {
  const focus: FakeFocus = { element: null };
  const fake: FakeDocument = {
    createElement: (tag: string): FakeElement => new FakeElement(tag, focus),
    get activeElement(): FakeElement | null {
      return focus.element;
    }
  };

  return fake;
};
