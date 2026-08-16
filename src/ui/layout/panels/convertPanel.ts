import type { ConvertTypeOption } from "../../../core/types";

/** UI(select文字列) → 実際の型 */
export function parseConvertTypeOption(v: string): ConvertTypeOption | undefined {
    switch (v) {
        case "": return "narou"; // 自動
        case "narou":
        case "kakuyomu":
            return v;
        default:
            return "narou"; // 想定外の値は安全側に倒す
    }
}

/** 実際の型 → UI(select文字列) 表示用 */
export function convertTypeOptionToString(t: ConvertTypeOption | undefined): string {
    return t === undefined ? "narou" : String(t);
}

export function renderConvertPanel(): string {
    return `
    <section class="panel" data-panel="convert">
      <h2>変換</h2>
      <p class="desc">各シーンのファイル(markdown)を小説サイトの形式に変換します。</p>
      <label class="field">
        <span class="field-label">Site</span>
        <select id="novel-site" value="narou">
            <option value="narou">小説家になろう</option>
            <option value="kakuyomu">カクヨム</option>
        </select>
      </label>
      <div class="actions">
        <button class="btn btn-primary" id="run-convert-btn">変換</button>
      </div>
      <div id="convert-result"></div>
    </section>
  `;
}
