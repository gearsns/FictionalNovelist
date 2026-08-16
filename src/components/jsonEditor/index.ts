import Sortable from "sortablejs";
import { type Schema, type JsonData, type FieldType } from "./types";
import { fillMissingFields, cleanValue, getCleanJsonString } from "./utils";
import EDITOR_STYLES from "./styles.css?inline"
import { createNode } from "./nodes";

export class JsonEditorElement extends HTMLElement {
  private data: JsonData = null;
  private schemaTemplate: Schema = null;
  private showPreview = false;
  private labelText = "JSON エディタ";
  private sortableInstances: Sortable[] = [];
  private previewEl: HTMLPreElement | null = null;

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

  set schema(s: Schema) {
    this.schemaTemplate = s;
    if (this.data !== null) this.data = fillMissingFields(this.data, this.schemaTemplate);
    this.renderRoot();
  }
  get schema() {
    return this.schemaTemplate;
  }

  set value(v: JsonData) {
    this.data = this.schemaTemplate ? fillMissingFields(v, this.schemaTemplate) : v;
    this.renderRoot();
  }
  get value() {
    return this.getValue();
  }

  getValue(): JsonData {
    return cleanValue(this.data);
  }

  setValue(v: JsonData) {
    this.value = v;
  }

  private emitChange() {
    this.dispatchEvent(
      new CustomEvent("json-editor-change", {
        detail: { value: this.getValue() },
        bubbles: true,
        composed: true,
      })
    );
  }

  private onCommit = () => {
    this.refreshPreview();
    this.emitChange();
  };

  private refreshPreview() {
    if (this.previewEl) this.previewEl.textContent = getCleanJsonString(this.data);
  }

  private renderRoot = () => {
    const root = this.shadowRoot!;
    root.innerHTML = `<style>${EDITOR_STYLES}</style><div class="je-root"></div>`;
    const rootDiv = root.querySelector(".je-root")!;

    if (this.data === null || this.schemaTemplate === null) {
      rootDiv.innerHTML = `<div class="je-empty">データが読み込まれていません。</div>`;
      return;
    }

    // ツールバーの構築
    const toolbar = document.createElement("div");
    toolbar.className = "je-toolbar";
    const title = document.createElement("h4");
    title.className = "je-title";
    title.textContent = this.labelText;

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "je-btn";
    toggleBtn.type = "button";
    toggleBtn.textContent = this.showPreview ? "👁 プレビューを隠す" : "👁 プレビューを表示";
    toggleBtn.onclick = () => {
      this.showPreview = !this.showPreview;
      this.renderRoot();
    };

    toolbar.appendChild(title);
    toolbar.appendChild(toggleBtn);
    rootDiv.appendChild(toolbar);

    // 古いSortableインスタンスの破棄
    this.sortableInstances.forEach((s) => s.destroy());
    this.sortableInstances = [];

    // ノードツリーのレンダリング
    const editorContainer = document.createElement("div");
    editorContainer.appendChild(
      this.renderNode(this.data, this.schemaTemplate, (val) => {
        this.data = val;
      })
    );
    rootDiv.appendChild(editorContainer);

    // JSONプレビューのレンダリング
    if (this.showPreview) {
      const pre = document.createElement("pre");
      pre.className = "je-preview";
      pre.textContent = getCleanJsonString(this.data);
      rootDiv.appendChild(pre);
      this.previewEl = pre;
    } else {
      this.previewEl = null;
    }
  };

  private renderNode = (
    data: JsonData,
    schema: Schema,
    updateParent: (v: JsonData) => void,
    overrideFieldType?: FieldType,
    keyName?: string
  ): HTMLElement => {
    const context = {
      renderRoot: this.renderRoot,
      onCommit: this.onCommit,
      registerSortable: (s: Sortable) => this.sortableInstances.push(s),
      createNode: this.renderNode,
    };

    return createNode(data, schema, updateParent, context, overrideFieldType, keyName);
  };
}

if (!customElements.get("json-editor")) {
  customElements.define("json-editor", JsonEditorElement);
}

declare global {
  interface HTMLElementTagNameMap {
    "json-editor": JsonEditorElement;
  }
}
