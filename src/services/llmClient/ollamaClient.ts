import type { AppSettings, LogFn, ThinkOption } from "../../core/types";
import { ThinkTagStripper } from "../thinkTagStripper";
import type { GenerateTextOptions, OllamaGenerateChunk, OllamaShowResponse, StreamCallback } from "../types";
import type { LLMClient } from "./types";

export { type StreamCallback };

export class OllamaClient implements LLMClient {
    private host: string;
    private model: string;
    private log: LogFn;
    private settings: AppSettings;

    /** デフォルトの think 設定。未設定(undefined)なら think フィールド自体を送らない。 */
    private think: ThinkOption | undefined;
    /** options に素通しする任意の追加パラメータ（例: stop, seed, mirostat など）。 */
    private extraOptions: Record<string, unknown> = {};
    /** リクエストボディのトップレベルに素通しする任意の追加パラメータ（例: format, raw, suffix）。
     *  ここに書いた値は think も含めて最終的に他の全設定より優先される。 */
    private extraBody: Record<string, unknown> = {};

    /** モデルごとの capabilities キャッシュ（/api/show の結果）。setModel() でクリアされる。 */
    private capabilitiesCache = new Map<string, string[] | null>();

    constructor(host: string, _key: string, model: string, log: LogFn, settings: AppSettings) {
        this.host = host;
        this.model = model;
        this.log = log;
        this.settings = settings;
    }

    setHost(host: string) {
        this.host = host;
        this.capabilitiesCache.clear();
    }

    setModel(model: string) {
        this.model = model;
        // モデルが変わったら capabilities も変わるのでキャッシュは破棄
    }

    setAPIKey(_key: string) {

    }

    /** thinkモードのデフォルト設定。undefined を渡すと「think フィールドを送らない」挙動に戻る。 */
    setThink(think: ThinkOption | undefined) {
        this.think = think;
    }

    /** options（temperature, num_ctx などと同階層）に素通しする追加パラメータをマージ設定する。 */
    setExtraOptions(options: Record<string, unknown>) {
        this.extraOptions = { ...this.extraOptions, ...options };
    }

    /** リクエストボディのトップレベルに素通しする追加パラメータをマージ設定する。 */
    setExtraBody(body: Record<string, unknown>) {
        this.extraBody = { ...this.extraBody, ...body };
    }

    /** 追加設定をリセットしたいとき用。 */
    resetOverrides() {
        this.think = undefined;
        this.extraOptions = {};
        this.extraBody = {};
    }

    private buildOptions(): Record<string, unknown> {
        const options: Record<string, unknown> = {
            temperature: this.settings.temperature,
            num_ctx: this.settings.numCtx,
            top_p: this.settings.topP,
            repeat_penalty: this.settings.repeatPenalty,
        };
        // Ollama treats num_predict: -1 as "generate until the model stops naturally",
        // which is what we want by default so long-form scenes aren't cut off mid-sentence.
        if (this.settings.numPredict !== undefined) {
            options.num_predict = this.settings.numPredict;
        }
        // 呼び出し側から渡された任意の追加オプションを最後にマージ（上書き優先）
        return { ...options, ...this.extraOptions };
    }

    /**
     * 対象モデルが thinking capability を持つかどうかを /api/show で確認する。
     * 結果はモデルごとにキャッシュする。判定できない場合は null を返し、
     * 呼び出し側は「わからないので think を送らない」等、安全側に倒すこと。
     */
    async supportsThinking(model: string = this.model): Promise<boolean | null> {
        if (this.capabilitiesCache.has(model)) {
            const cached = this.capabilitiesCache.get(model)!;
            return cached === null ? null : cached.includes("thinking");
        }
        const url = `${this.host.replace(/\/+$/, "")}/api/show`;
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model }),
            });
            if (!res.ok) {
                this.capabilitiesCache.set(model, null);
                return null;
            }
            const data = (await res.json()) as OllamaShowResponse;
            const capabilities = data.capabilities ?? [];
            this.capabilitiesCache.set(model, capabilities);
            return capabilities.includes("thinking");
        } catch {
            this.capabilitiesCache.set(model, null);
            return null;
        }
    }

    /**
     * リクエストボディを組み立てる。
     * @param think このリクエストで使う think 設定（未指定なら不明=送らない）
     * @param includeThink false の場合、think が設定されていてもボディに含めない
     *   （対象モデルが thinking 非対応と判明している場合に使う）
     */
    private buildBody(
        prompt: string,
        think: ThinkOption | undefined,
        includeThink: boolean
    ): Record<string, unknown> {
        const body: Record<string, unknown> = {
            model: this.model,
            prompt,
            stream: true,
            keep_alive: -1,
            options: this.buildOptions(),
        };
        if (includeThink && think !== undefined) {
            body.think = think;
        }
        // extraBody は何よりも優先（think の上書きや format/raw/suffix なども可能）
        return { ...body, ...this.extraBody };
    }

    /**
     * Streaming generate call against /api/generate (NDJSON response).
     * `onChunk`, if given, is invoked after every chunk with the full response text
     * accumulated so far and the delta just received. `onThinking` (optional) receives
     * the separate reasoning-trace stream for thinking-capable models.
     *
     * 第2引数は後方互換のため StreamCallback（関数）と GenerateTextOptions（オブジェクト）
     * のどちらでも受け付ける。
     */
    async generateText(
        prompt: string,
        onChunkOrOptions?: StreamCallback | GenerateTextOptions,
        signal?: AbortSignal
    ): Promise<string> {
        const opts: GenerateTextOptions =
            typeof onChunkOrOptions === "function" ? { onChunk: onChunkOrOptions } : onChunkOrOptions ?? {};
        const { onChunk, onThinking } = opts;
        const requestedThink = opts.think !== undefined ? opts.think : this.think;
        const stripThinkTags = opts.stripThinkTags ?? true;
        const stripper = new ThinkTagStripper();

        // think を送りたい場合のみ、対象モデルが対応しているか事前確認する。
        // 未対応と判明しているモデル（Gemma等）には think フィールド自体を送らないことで
        // 「unknown parameter」等のエラーを回避する。判定不能(null)の場合は一旦送ってみる。
        let includeThink = requestedThink !== undefined;
        if (includeThink) {
            const supported = await this.supportsThinking();
            if (supported === false) {
                includeThink = false;
                if (requestedThink) {
                    this.log(
                        `モデル "${this.model}" は thinking 非対応のため think パラメータを送信しません。`,
                        "info"
                    );
                }
            }
        }
        const url = `${this.host.replace(/\/+$/, "")}/api/generate`;
        const doFetch = (includeThinkFlag: boolean) =>
            fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(this.buildBody(prompt, requestedThink, includeThinkFlag)),
                signal
            });

        let res: Response;
        try {
            res = await doFetch(includeThink);
        } catch (e) {
            throw new Error(
                `Ollama (${url}) に接続できませんでした。ollama serve が起動しているか、` +
                `OLLAMA_ORIGINS でこのページのオリジンが許可されているか確認してください。詳細: ${String(e)}`
            );
        }

        // think を送って失敗した場合、モデル側が非対応というエラーの可能性があるので
        // think を外して一度だけリトライする（capabilities判定に失敗していたケースの保険）。
        if (!res.ok && includeThink) {
            const bodyText = await res.text().catch(() => "");
            const looksLikeThinkError = /think|thinking/i.test(bodyText);
            if (looksLikeThinkError) {
                this.log(
                    `think パラメータ付きのリクエストが失敗したため、think なしで再試行します。詳細: ${bodyText}`,
                    "info"
                );
                try {
                    res = await doFetch(false);
                } catch (e) {
                    throw new Error(
                        `Ollama (${url}) に接続できませんでした。詳細: ${String(e)}`
                    );
                }
            } else {
                throw new Error(`Ollama がエラーを返しました (HTTP ${res.status}): ${bodyText}`);
            }
        }

        if (!res.ok) {
            const bodyText = await res.text().catch(() => "");
            throw new Error(`Ollama がエラーを返しました (HTTP ${res.status}): ${bodyText}`);
        }

        let fullText = "";
        let fullThinking = "";

        // response 側デルタを処理する。stripThinkTags が有効なら生の <think> タグを
        // その場で剥がし、剥がした中身は thinking 側へ回す（何も取りこぼさない）。
        const emitResponseDelta = (delta: string) => {
            if (!delta) return;
            if (!stripThinkTags) {
                fullText += delta;
                onChunk?.(fullText, delta);
                return;
            }
            const { clean, thinking } = stripper.feed(delta);
            if (thinking) {
                fullThinking += thinking;
                onThinking?.(fullThinking, thinking);
            }
            if (clean) {
                fullText += clean;
                onChunk?.(fullText, clean);
            }
        };

        if (!res.body) {
            // Fallback for environments without a readable stream (shouldn't normally happen).
            const data = (await res.json()) as OllamaGenerateChunk;
            if (data.thinking) {
                fullThinking += data.thinking;
                onThinking?.(fullThinking, data.thinking);
            }
            emitResponseDelta(data.response ?? "");
            if (stripThinkTags) {
                const { clean, thinking } = stripper.flush();
                if (thinking) {
                    fullThinking += thinking;
                    onThinking?.(fullThinking, thinking);
                }
                if (clean) {
                    fullText += clean;
                    onChunk?.(fullText, clean);
                }
            }
            return fullText;
        }

        const reader = res.body.getReader();
        const onAbort = () => {
            reader.cancel().catch(() => { });
        };
        signal?.addEventListener("abort", onAbort);
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        const handleChunk = (raw: string) => {
            let chunk: OllamaGenerateChunk;
            try {
                chunk = JSON.parse(raw) as OllamaGenerateChunk;
            } catch {
                return; // ignore malformed / partial lines
            }
            if (chunk.thinking) {
                fullThinking += chunk.thinking;
                onThinking?.(fullThinking, chunk.thinking);
            }
            emitResponseDelta(chunk.response ?? "");
        };

        try {
            while (true) {
                signal?.throwIfAborted();
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let newlineIndex: number;
                while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
                    const line = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 1);
                    if (line) handleChunk(line);
                }
            }
        } finally {
            // 後処理でリスナー解除と lock 解放
            signal?.removeEventListener("abort", onAbort);
            reader.releaseLock();
        }

        // Flush any trailing partial line left in the buffer.
        const tail = buffer.trim();
        if (tail) handleChunk(tail);

        // ストリーム終了時、剥がしきれず溜まっていたバッファを最終確定させる
        if (stripThinkTags) {
            const { clean, thinking } = stripper.flush();
            if (thinking) {
                fullThinking += thinking;
                onThinking?.(fullThinking, thinking);
            }
            if (clean) {
                fullText += clean;
                onChunk?.(fullText, clean);
            }
        }

        return fullText;
    }

    /** Basic connectivity + model existence check, used by the UI's "接続テスト" button. */
    async checkConnection(): Promise<{ ok: boolean; message: string }> {
        const url = `${this.host.replace(/\/+$/, "")}/api/tags`;
        try {
            const res = await fetch(url);
            if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
            const data = (await res.json()) as { models?: { name: string }[] };
            const names = (data.models ?? []).map((m) => m.name);
            if (names.length === 0) {
                return { ok: true, message: "接続成功。ただしモデルが1つもインストールされていません。" };
            }
            const hasModel = names.some((n) => n === this.model || n.startsWith(`${this.model}:`));
            this.log(`Ollama接続成功。利用可能なモデル: ${names.join(", ")}`, "success");

            let thinkingNote = "";
            if (hasModel) {
                const supportsThinking = await this.supportsThinking();
                if (supportsThinking !== null) {
                    thinkingNote = supportsThinking
                        ? "（thinkingモード対応）"
                        : "（thinkingモード非対応）";
                }
            }

            return {
                ok: true,
                message: hasModel
                    ? `接続成功。モデル "${this.model}" を利用できます。${thinkingNote}`
                    : `接続成功。ただし "${this.model}" が見つかりません。利用可能: ${names.join(", ")}`,
            };
        } catch (e) {
            return { ok: false, message: String(e) };
        }
    }
}
