export function renderHeader(): string {
    return `
  <header class="app-header">
    <div class="brand">
      <span class="seal">FN</span>
      <div>
        <h1>Fiction<span class="ai">a</span>l Novel<span class="ai">i</span>st</h1>
        <div class="tagline">ローカル Ollama で綴る、長編小説執筆エンジン</div>
      </div>
    </div>
    <div class="btn-area">
      <div class="folder-status" id="folder-status">
        <span class="dot"></span>
        <span id="folder-status-text">フォルダ未選択</span>
      </div>
      <div id="workspace-container"></div>
      <button class="btn btn-primary" id="pick-folder-btn">フォルダを選択</button>
      <button class="btn" id="open-workspace-btn">ワークスペース</button>
      <a class="github" href="https://github.com/gearsns/FictionalNovelist"></a>
    </div>
  </header>
  `;
}
