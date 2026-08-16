export function renderWritePanel(): string {
    return `
    <section class="panel" data-panel="write">
      <h2>執筆</h2>
      <p class="desc">アウトラインに未執筆のシーンがある限り、指定した数だけ順番に執筆します。</p>
      <div class="file-list" id="file-list-write"></div>
      <label class="field">
        <span class="field-label">執筆するシーン数</span>
        <input type="number" id="write-count" value="1" min="1" />
      </label>
      <div class="actions">
        <button class="btn btn-primary" id="run-write-btn">執筆開始</button>
      </div>
      <label class="field" id="rewrite-scene-field">
        <span class="field-label">シーンを選択</span>
        <select id="rewrite-scene-select"></select>
      </label>
      <div class="actions">
        <button class="btn" id="run-rewrite-btn">再執筆</button>
      </div>
      <div id="write-result"></div>
    </section>
  `;
}
