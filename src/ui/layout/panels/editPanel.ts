export function renderEditPanel(): string {
    return `
    <section class="panel" data-panel="edit">
      <h2>編集</h2>
      <p class="desc">
        生成された内容を直接編集し、フォルダ内のファイルに上書き保存します。JSONはカード形式でドラッグ&ドロップの並べ替えができ、
        プロットやシーン本文はMarkdownのプレビュー付きエディタで編集できます。
      </p>
      <div class="row" style="align-items: flex-end;">
        <label class="field file-types">
          <span class="field-label">編集するファイル</span>
          <select id="edit-file-select">
            <option value="plot">プロット（plot.md・Markdown）</option>
            <option value="characters">登場人物（characters.json）</option>
            <option value="world">世界観（world.json）</option>
            <option value="outline">アウトライン（outline.json）</option>
            <option value="scene">本文（drafts/scene_N.md・Markdown）</option>
            <option value="summary">要約（drafts/scene_N_summary.txt・Text）</option>
            <option value="sceneState">状態（state_snapshots/state_N.json）</option>
          </select>
        </label>
        <label class="field" id="edit-scene-field">
          <span class="field-label">シーンを選択</span>
          <select id="edit-scene-select"></select>
        </label>
        <label class="field" id="edit-scene-state-field">
          <span class="field-label">シーンを選択</span>
          <select id="edit-scene-state-select"></select>
        </label>
        <label class="field" id="edit-scene-summary-field">
          <span class="field-label">シーンを選択</span>
          <select id="edit-scene-summary-select"></select>
        </label>
      </div>
      <div class="actions">
        <button class="btn" id="edit-reload-btn">再読み込み</button>
        <button class="btn btn-primary" id="edit-save-btn">保存</button>
      </div>
      <div class="hint" id="edit-hint"></div>
      <div id="edit-mount"></div>
    </section>
  `;
}
