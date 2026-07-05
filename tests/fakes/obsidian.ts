/**
 * Test stand-in for the `obsidian` module (wired via `resolve.alias` in
 * vitest.config.mjs). The real `obsidian` npm package is types-only — there is
 * no runtime to import in vitest — so impure src modules were previously
 * untestable. This stub provides just enough runtime for them: the file-tree
 * classes (`instanceof` works because src and tests resolve to this same
 * module), Component lifecycle, YAML helpers (backed by the `yaml` package —
 * nested `longform.scenes` arrays must parse faithfully), and no-op UI shells.
 *
 * The in-memory vault/app implementation lives beside this in fake-app.ts.
 */

import * as YAML from "yaml";

// --- File tree -----------------------------------------------------------------

export class TAbstractFile {
  path = "";
  name = "";
  parent: TFolder | null = null;
}

export class TFile extends TAbstractFile {
  basename = "";
  extension = "";
  stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
  isRoot(): boolean {
    return this.path === "/";
  }
}

// --- Component lifecycle ---------------------------------------------------------

export class Component {
  private _loaded = false;
  private _children: Component[] = [];
  private _cleanups: Array<() => void> = [];

  load(): void {
    if (this._loaded) return;
    this._loaded = true;
    this.onload();
    for (const c of this._children) c.load();
  }

  unload(): void {
    if (!this._loaded) return;
    this._loaded = false;
    for (const c of this._children) c.unload();
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
    this.onunload();
  }

  onload(): void {}
  onunload(): void {}

  addChild<T extends Component>(child: T): T {
    this._children.push(child);
    if (this._loaded) child.load();
    return child;
  }

  register(cb: () => void): void {
    this._cleanups.push(cb);
  }

  /** Event refs from the fake emitters are `{ detach() }`; detach on unload. */
  registerEvent(ref: unknown): void {
    const r = ref as { detach?: () => void } | undefined;
    if (r?.detach) this._cleanups.push(() => r.detach?.());
  }

  registerDomEvent(): void {}
  registerInterval(id: number): number {
    return id;
  }
}

// --- Notices (collected so tests can assert user-facing errors) -----------------

export const capturedNotices: string[] = [];

export class Notice {
  constructor(message: string, _timeout?: number) {
    capturedNotices.push(message);
  }
  hide(): void {}
}

// --- YAML / path helpers ---------------------------------------------------------

export function parseYaml(text: string): unknown {
  return YAML.parse(text);
}

export function stringifyYaml(obj: unknown): string {
  return YAML.stringify(obj);
}

/** Mirrors Obsidian's normalizePath: forward slashes, collapsed, no edge slashes. */
export function normalizePath(path: string): string {
  const cleaned = path
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  return cleaned === "" ? "/" : cleaned;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => unknown,
  wait = 0,
  _resetTimer = false
): ((...args: A) => void) & { cancel(): void; run(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;
  const debounced = (...args: A) => {
    pending = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const a = pending as A;
      pending = null;
      fn(...a);
    }, wait);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  };
  debounced.run = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (pending) {
      const a = pending;
      pending = null;
      fn(...a);
    }
  };
  return debounced;
}

// --- UI shells (imported at value level by some modules; inert here) -------------

export class Modal {
  app: unknown;
  constructor(app: unknown) {
    this.app = app;
  }
  open(): void {}
  close(): void {}
  onOpen(): void {}
  onClose(): void {}
}

export class FuzzySuggestModal<T> extends Modal {
  setPlaceholder(_text: string): void {}
  getItems(): T[] {
    return [];
  }
  getItemText(_item: T): string {
    return "";
  }
  onChooseItem(_item: T): void {}
}

export class Menu {
  addItem(_cb: (item: unknown) => void): this {
    return this;
  }
  addSeparator(): this {
    return this;
  }
  onHide(_cb: () => void): void {}
  showAtMouseEvent(_e: unknown): void {}
}

export class Setting {
  constructor(_el: unknown) {}
}

export function setIcon(_el: unknown, _icon: string): void {}

/** Real Obsidian renders markdown; tests that reach this should stub per-case. */
export const MarkdownRenderer = {
  render: async (
    _app: unknown,
    markdown: string,
    el: { innerHTML?: string },
    _sourcePath: string,
    _component: unknown
  ): Promise<void> => {
    el.innerHTML = markdown;
  },
};

/** Present so `adapter instanceof FileSystemAdapter` is false for the fake
 *  vault's plain-object adapter (pandoc paths stay disabled in tests). */
export class FileSystemAdapter {
  getBasePath(): string {
    return "";
  }
}
