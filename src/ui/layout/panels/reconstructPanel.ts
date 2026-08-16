export function renderReconstructPanel(): string {
    return `
    <section class="panel" data-panel="reconstruct">
      <h2>状態再構築</h2>
      <p class="desc">
        ーンファイル（例: drafts/scene_2.md）を手動編集した後、指定したシーンまでの状態（キャラクターの位置・経験など）と要約を再生成し、整合性を保ちます。
        既存のスナップショットがあればそこから再開します。
      </p>
      <label class="field">
        <span class="field-label">対象シーンID</span>
        <select id="reconstruct-scene-select"></select>
      </label>

      <div class="actions">
        <button class="btn btn-primary" id="run-reconstruct-btn">再構築を実行</button>
      </div>
    </section>
  `;
}
