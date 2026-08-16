export function renderOutlinePanel(): string {
    return `
    <section class="panel" data-panel="outline">
      <h2>アウトライン</h2>
      <p class="desc">プロット・登場人物・世界観をもとに、章とシーンの構成を生成します。</p>
      <div class="file-list" id="file-list-outline"></div>
      <div class="actions">
        <button class="btn btn-primary" id="run-outline-btn">アウトラインを生成</button>
      </div>
      <div id="outline-result"></div>
    </section>
  `;
}
