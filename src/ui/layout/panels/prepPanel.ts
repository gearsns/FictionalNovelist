import { Config, DEFAULT_SETTINGS } from "../../../core/config";
import type { ProviderOption, ThinkOption } from "../../../core/types";

/** UI(select文字列) → 実際の型 */
export function parseThinkOption(v: string): ThinkOption | undefined {
    switch (v) {
        case "": return undefined; // 自動
        case "true": return true;
        case "false": return false;
        case "low":
        case "medium":
        case "high":
        case "max":
            return v;
        default:
            return undefined; // 想定外の値は安全側に倒す
    }
}

export function parseProviderOption(v: string): ProviderOption {
    switch (v) {
        case "": return "ollama"; // 自動
        case "ollama":
        case "lmstudio":
            return v;
        default:
            return "ollama"; // 想定外の値は安全側に倒す
    }
}

/** 実際の型 → UI(select文字列) 表示用 */
export function thinkOptionToString(t: ThinkOption | undefined): string {
    return t === undefined ? "" : String(t);
}
export function providerOptionToString(t: ProviderOption | undefined): string {
    return t === undefined ? "ollama" : String(t);
}

export function renderPrepPanel(): string {
    return `
    <section class="panel active" data-panel="prep">
      <h2>準備</h2>
      <p class="desc">
        小説プロジェクトを保存するフォルダを選択し、ローカルの Ollama サーバーへの接続を設定します。
        すべてのファイルはこのフォルダ内に直接書き出され、サーバーには一切送信されません。
      </p>
      <div class="card">
        <label class="field">
          <span class="field-label">ホスト</span>
          <div class="input-group">
            <select id="settings-provider" value="${providerOptionToString(DEFAULT_SETTINGS.provider)}">
              <option value="ollama">Ollama</option>
              <option value="lmstudio">LM Studio</option>
            </select>
            <input type="text" id="settings-host" value="${DEFAULT_SETTINGS.host}" />
          </div> 
          <div class="hint">既定は http://127.0.0.1:11434 。ブラウザから叩くため <code>OLLAMA_ORIGINS</code> の許可設定が必要な場合があります。</div>
        </label>
        <label class="field">
          <span class="field-label">モデル名</span>
          <input type="text" id="settings-model" value="${DEFAULT_SETTINGS.model}" />
          <div class="hint">例: llama3.1, qwen2.5:14b, gemma2 など。事前に <code>ollama pull</code> しておいてください。</div>
        </label>
        <label class="field">
          <span class="field-label">APIキー</span>
          <input type="text" id="settings-apikey" value="${DEFAULT_SETTINGS.apiKey}" />
          <div class="hint">LM Studioを使用する際は、「lm-studio」なのどのダミー文字列を指定してください。</div>
        </label>
        <div class="actions">
          <button class="btn" id="test-connection-btn">接続テスト</button>
        </div>
      </div>
      <div class="card">
        <label class="field">
          <span class="field-label">視点設定</span>
          <input type="text" id="settings-viewpoint" value="${DEFAULT_SETTINGS.viewpoint}" />
        </label>
        <label class="field">
          <span class="field-label">文体・スタイル</span>
          <textarea id="settings-style">${DEFAULT_SETTINGS.style}</textarea>
        </label>
        <div class="row">
          <label class="field">
            <span class="field-label">プロット目標文字数（下限）</span>
            <input type="number" id="settings-min" value="${DEFAULT_SETTINGS.minChars}" />
          </label>
          <label class="field">
            <span class="field-label">プロット目標文字数（上限）</span>
            <input type="number" id="settings-max" value="${DEFAULT_SETTINGS.maxChars}" />
          </label>
        </div>
      </div>
      <div class="card">
        <div class="field-label param">生成パラメータ（options）</div>
        <div class="row">
          <label class="field">
            <span class="field-label">temperature</span>
            <input type="number" id="settings-temperature" value="${DEFAULT_SETTINGS.temperature}" step="0.05" min="0" max="2" />
          </label>
          <label class="field">
            <span class="field-label">top_p</span>
            <input type="number" id="settings-top-p" value="${DEFAULT_SETTINGS.topP}" step="0.05" min="0" max="1" />
          </label>
          <label class="field">
            <span class="field-label">repeat_penalty</span>
            <input type="number" id="settings-repeat-penalty" value="${DEFAULT_SETTINGS.repeatPenalty}" step="0.05" min="0" max="3" />
          </label>
        </div>
        <div class="row">
          <label class="field">
            <span class="field-label">think</span>
            <select id="settings-think" value="${thinkOptionToString(DEFAULT_SETTINGS.think)}">
                <option value="">自動（thinkを送らない）</option>
                <option value="false">オフ</option>
                <option value="true">オン</option>
                <option value="low">オン（軽め: low）</option>
                <option value="medium">オン（普通: medium）</option>
                <option value="high">オン（重め: high）</option>
                <option value="max">オン（最大: max）</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">num_ctx（コンテキスト長）</span>
            <input type="number" id="settings-num-ctx" value="${DEFAULT_SETTINGS.numCtx}" step="512" min="512" />
          </label>
          <label class="field">
            <span class="field-label">num_predict（最大生成トークン数）</span>
            <input type="number" id="settings-num-predict" value="${DEFAULT_SETTINGS.numPredict}" step="128" />
          </label>
        </div>
        <div class="hint">
          途中で文章が切れる場合は、まず <code>num_predict</code> を <code>-1</code>（無制限）にし、次に
          <code>num_ctx</code> を上げてください（プロンプト＋出力の合計トークン数が num_ctx に収まらないと
          そこで打ち切られます）。num_ctx を上げるほどメモリ消費と処理時間が増えます。
        </div>
        <div class="actions">
          <button class="btn" id="save-settings-btn">この設定をフォルダに保存</button>
        </div>
        <div class="hint" id="settings-persist-hint">
          フォルダを選択すると、既存の設定（<code>${Config.SETTINGS_FILE}</code>）があれば自動的に読み込みます。変更内容はフォルダ選択後、自動的に保存されます。
        </div>
      </div>
    </section>
  `;
}
