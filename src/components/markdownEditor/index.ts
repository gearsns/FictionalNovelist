import { marked } from "marked";
import type { Tokens, TokenizerAndRendererExtension } from 'marked';
import STYLE from "./styles.css?inline"

// ============================================================================
// <markdown-editor> — a split-pane Markdown editor with a live preview,
// built as a Custom Element so it (like <json-editor>) can be dropped into
// any page. Used here for plot.md and drafts/scene_{id}.md.
//
// Usage:
//   const el = document.createElement("markdown-editor") as MarkdownEditorElement;
//   el.label = "プロット";
//   el.value = "# 見出し\n\n本文...";
//   el.mode = "split"; // "editor" | "split" | "preview" — optional, defaults to "split"
//   el.addEventListener("markdown-editor-change", (e) => {
//     const text = (e as CustomEvent).detail.value;
//   });
//   el.addEventListener("markdown-editor-mode-change", (e) => {
//     const mode = (e as CustomEvent).detail.mode;
//   });
//   container.appendChild(el);
// ============================================================================
marked.setOptions({ breaks: true });

// --------------------------------------------------
// 1. カスタムトークンの型定義
// --------------------------------------------------
interface RubyToken {
  type: 'ruby';
  raw: string;
  text: string;
  ruby: string;
  tokens: Tokens.Generic[];
}

interface KentenToken {
  type: 'kenten';
  raw: string;
  text: string;
  tokens: Tokens.Generic[];
}

// --------------------------------------------------
// 2. ルビ用拡張機能 : R[漢字](かんじ)
// --------------------------------------------------
const rubyExtension: TokenizerAndRendererExtension = {
  name: 'ruby',
  level: 'inline',

  start(src: string): number {
    return src.indexOf('R[');
  },

  tokenizer(this: any, src: string): RubyToken | undefined {
    const rule = /^R\[([^\]]+)\]\(([^)]+)\)/;
    const match = rule.exec(src);

    if (match) {
      const token: RubyToken = {
        type: 'ruby',
        raw: match[0],
        text: match[1],
        ruby: match[2],
        tokens: []
      };

      // 親文字の中身をネスト解析
      this.lexer.inlineTokens(token.text, token.tokens);
      return token;
    }
    return undefined;
  },

  renderer(this: any, token: Tokens.Generic): string {
    const rubyToken = token as RubyToken;
    const parentHtml = this.parser.parseInline(rubyToken.tokens);
    return `<ruby>${parentHtml}<rt>${rubyToken.ruby}</rt></ruby>`;
  }
};

// --------------------------------------------------
// 3. 圏点用拡張機能 : ・・圏点・・
// --------------------------------------------------
const kentenExtension: TokenizerAndRendererExtension = {
  name: 'kenten',
  level: 'inline',

  start(src: string): number {
    return src.indexOf('・・');
  },

  tokenizer(this: any, src: string): KentenToken | undefined {
    const rule = /^・・([^・\n]+?)・・/;
    const match = rule.exec(src);

    if (match) {
      const token: KentenToken = {
        type: 'kenten',
        raw: match[0],
        text: match[1],
        tokens: []
      };

      // 対象テキストの中身をネスト解析
      this.lexer.inlineTokens(token.text, token.tokens);
      return token;
    }
    return undefined;
  },

  renderer(this: any, token: Tokens.Generic): string {
    const kentenToken = token as KentenToken;
    const parentHtml = this.parser.parseInline(kentenToken.tokens);

    // ネストされた装飾を除いた「実際の文字数」を算出
    const getPlainLength = (tokens?: Tokens.Generic[]): number => {
      let length = 0;
      if (!tokens) return 0;
      for (const t of tokens) {
        if (t.tokens) {
          length += getPlainLength(t.tokens as Tokens.Generic[]);
        } else if (t.text) {
          length += t.text.length;
        }
      }
      return length;
    };

    const plainLength = getPlainLength(kentenToken.tokens);
    const kentenMarks = '・'.repeat(plainLength);

    return `<ruby>${parentHtml}<rt>${kentenMarks}</rt></ruby>`;
  }
};

// --------------------------------------------------
// 4. marked に登録して使用
// --------------------------------------------------
marked.use({ extensions: [rubyExtension, kentenExtension] });

type ViewMode = "split" | "editor" | "preview";
export class MarkdownEditorElement extends HTMLElement {
    private text = "";
    private labelText = "Markdown エディタ";
    // Internal view-mode state. Exposed publicly via the `mode` getter/setter
    // below so a host page can persist the user's chosen mode (edit-only /
    // split / preview-only) across re-creations of this element — e.g. when
    // switching between files in an editor UI — instead of it silently
    // resetting to "split" every time.
    private currentMode: ViewMode = "split";
    private previewEl: HTMLDivElement | null = null;
    static get observedAttributes() {
        return ["label"];
    }
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
        this.renderRoot();
    }
    attributeChangedCallback(name: string, _old: string, value: string) {
        if (name === "label") {
            this.labelText = value;
            this.renderRoot();
        }
    }
    set label(v: string) {
        this.labelText = v;
        this.renderRoot();
    }
    get label() {
        return this.labelText;
    }
    /** The raw Markdown text. */
    set value(v: string) {
        this.text = v ?? "";
        this.renderRoot();
    }
    get value() {
        return this.text;
    }
    /**
     * The current view mode ("editor" | "split" | "preview"). Settable from
     * outside so a host page can restore the user's last-selected mode when
     * this element is (re)created, e.g. after switching files.
     */
    set mode(v: ViewMode) {
        this.currentMode = v;
        this.renderRoot();
    }
    get mode(): ViewMode {
        return this.currentMode;
    }
    getValue(): string {
        return this.text;
    }
    setValue(v: string) {
        this.value = v;
    }
    private emitChange() {
        this.dispatchEvent(
            new CustomEvent("markdown-editor-change", {
                detail: { value: this.text },
                bubbles: true,
                composed: true,
            })
        );
    }
    private emitModeChange() {
        this.dispatchEvent(
            new CustomEvent("markdown-editor-mode-change", {
                detail: { mode: this.currentMode },
                bubbles: true,
                composed: true,
            })
        );
    }
    private renderRoot() {
        const root = this.shadowRoot!;
        root.innerHTML = `<style>${STYLE}</style><div class="md-root"></div>`;
        const rootDiv = root.querySelector(".md-root")!;
        const toolbar = document.createElement("div");
        toolbar.className = "md-toolbar";
        const title = document.createElement("h4");
        title.className = "md-title";
        title.textContent = this.labelText;
        const btns = document.createElement("div");
        btns.className = "md-btns";
        const modes: Array<[ViewMode, string]> = [
            ["editor", "編集のみ"],
            ["split", "分割表示"],
            ["preview", "プレビューのみ"],
        ];
        modes.forEach(([m, text]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = `md-btn${this.currentMode === m ? " active" : ""}`;
            b.textContent = text;
            b.onclick = () => {
                if (this.currentMode === m) return;
                this.currentMode = m;
                this.renderRoot();
                this.emitModeChange();
            };
            btns.appendChild(b);
        });
        toolbar.appendChild(title);
        toolbar.appendChild(btns);
        rootDiv.appendChild(toolbar);
        const panes = document.createElement("div");
        panes.className = `md-panes ${this.currentMode === "split" ? "split" : this.currentMode === "editor" ? "editor-only" : "preview-only"
            }`;
        if (this.currentMode !== "preview") {
            const editorWrap = document.createElement("div");
            const editorLabel = document.createElement("p");
            editorLabel.className = "md-pane-label";
            editorLabel.textContent = "編集 (Markdown)";
            const textarea = document.createElement("textarea");
            textarea.className = "md-editor";
            textarea.value = this.text;
            textarea.spellcheck = false;
            textarea.oninput = () => {
                this.text = textarea.value;
                this.updatePreview();
                this.emitChange();
            };
            if (this.currentMode === "split") editorWrap.appendChild(editorLabel);
            editorWrap.appendChild(textarea);
            panes.appendChild(editorWrap);
        }
        if (this.currentMode !== "editor") {
            const previewWrap = document.createElement("div");
            const previewLabel = document.createElement("p");
            previewLabel.className = "md-pane-label";
            previewLabel.textContent = "プレビュー";
            const preview = document.createElement("div");
            preview.className = "md-preview";
            if (this.currentMode === "split") previewWrap.appendChild(previewLabel);
            previewWrap.appendChild(preview);
            panes.appendChild(previewWrap);
            this.previewEl = preview;
            this.updatePreview();
        } else {
            this.previewEl = null;
        }
        rootDiv.appendChild(panes);
    }
    private updatePreview() {
        if (!this.previewEl) return;
        this.previewEl.innerHTML = marked.parse(this.text, { async: false }) as string;
    }
}
if (!customElements.get("markdown-editor")) {
    customElements.define("markdown-editor", MarkdownEditorElement);
}
declare global {
    interface HTMLElementTagNameMap {
        "markdown-editor": MarkdownEditorElement;
    }
}
