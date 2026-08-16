export function renderFooter(): string {
    return `
  <div class="stream-bar" id="stream-bar">
    <span class="stream-stop" id="stream-stop" title="stop"></span>
    <span class="stream-dot"></span>
    <span class="stream-text" id="stream-text">待機中</span>
  </div>
  <div class="console-wrap">
    <div class="console-head">
      <span>実行ログ</span>
      <button class="btn" id="clear-log-btn">クリア</button>
    </div>
    <div class="console" id="console"></div>
  </div>
  `;
}
