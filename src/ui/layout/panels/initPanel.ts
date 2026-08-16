export function renderInitPanel(): string {
    return `
    <section class="panel" data-panel="init">
      <h2>初期化</h2>
      <p class="desc">アイデアからプロット・登場人物・世界観を生成します。既に存在するファイルはスキップされます。</p>
      <div class="file-list" id="file-list-init"></div>
      <label class="field">
        <span class="field-label">小説のアイデア</span>
        <textarea id="idea-text" placeholder="例：記憶を失った灯台守が、海の向こうから届く手紙の差出人を探す物語。"></textarea>
      </label>
      <label class="field">
        <span class="field-label">またはアイデアファイルを読み込む（.txt / .md / .json）</span>
        <input type="file" id="idea-file" accept=".txt,.md,.markdown,.json" />
      </label>
      <div class="hint">「初期化を実行」は現在のplotファイルを破棄して作成します。エラー発生などで、途中から実行する場合は「（途中から）実行」で始めてください</div>
      <div class="actions">
        <button class="btn btn-primary" id="run-init-btn">初期化を実行</button>
        <button class="btn" id="rerun-init-btn">（途中から）実行</button>
      </div>
    </section>
  `;
}
