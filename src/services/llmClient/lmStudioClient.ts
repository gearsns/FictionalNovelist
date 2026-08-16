import type { AppSettings, LogFn, ThinkOption } from "../../core/types";
import { ThinkTagStripper } from "../thinkTagStripper";
import type { GenerateTextOptions, StreamCallback } from "../types";
import type { LLMClient } from "./types";

export { type StreamCallback };

/**
 * LM Studio 用クライアント。
 *
 * 公開インターフェース（constructor / setHost / setModel / setThink /
 * setExtraOptions / setExtraBody / resetOverrides / supportsThinking /
 * generateText / checkConnection）は OllamaClient と完全に同じシグネチャ。
 * 呼び出し側のコードは `new OllamaClient(...)` を `new LMStudioClient(...)`
 * に差し替えるだけで動く想定。
 *
 * 内部的には OpenAI 互換の `/v1/chat/completions` を使う。
 *
 * `/v1/completions`（legacy）は使わない。LM Studio公式ドキュメントに
 * 「OpenAI本家では既に廃止され、LM Studioは後方互換のために残しているだけ。
 *   chat-tunedモデルに使うと想定外のトークンが出ることがある」と明記されており、
 * 新機能（reasoning分離、tool calling等）も追加されないため。
 * 単発プロンプトは `messages: [{ role: "user", content: prompt }]` に
 * 包んで送ることで、rawプロンプトを渡す元の呼び出し方法は維持できる。
 *
 * 注意点（Ollamaとの非互換部分）:
 * - `/api/show` に相当するcapabilities APIが無いため、supportsThinking() は
 *   モデルID名によるヒューリスティック判定（当てにならないので参考程度）。
 * - thinking の分離は、対応モデル（gpt-oss等）であれば `delta.reasoning`
 *   （ストリーミング）/ `message.reasoning`（非ストリーミング）で得られる。
 *   非対応モデルは `<think>...</think>` をcontentに埋め込んでくる場合があるので、
 *   その保険として ThinkTagStripper も併用する。
 * - num_ctx はモデルロード時の設定であり、生成リクエストのパラメータでは
 *   変更できない（無視される）。
 */
export class LMStudioClient implements LLMClient {
    private host: string;
    private apiKey: string;
    private model: string;
    private log: LogFn;
    private settings: AppSettings;

    private extraOptions: Record<string, unknown> = {};
    private extraBody: Record<string, unknown> = {};

    // モデル名からの簡易ヒューリスティック判定結果をキャッシュ（正式なAPIが無いため参考値）
    private capabilitiesCache = new Map<string, boolean | null>();

    // 既知の推論系モデルのパターン（当てずっぽうなので随時更新する前提）
    private static readonly REASONING_MODEL_PATTERNS = [
        /r1/i, /qwq/i, /reasoning/i, /thinking/i, /gpt-oss/i, /o1/i, /o3/i, /qwen3/i,
    ];

    constructor(host: string, key: string, model: string, log: LogFn, settings: AppSettings) {
        this.host = host;
        this.apiKey = key;
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
    }

    setAPIKey(key: string) {
        this.apiKey = key;
    }

    setThink(_: ThinkOption | undefined) {
    }

    setExtraOptions(options: Record<string, unknown>) {
        this.extraOptions = { ...this.extraOptions, ...options };
    }

    setExtraBody(body: Record<string, unknown>) {
        const nextBody = { ...this.extraBody, ...body };
        // undefined がセットされたキーを削除
        Object.keys(nextBody).forEach((key) => {
            if (nextBody[key] === undefined) {
                delete nextBody[key];
            }
        });

        this.extraBody = nextBody;
    }

    resetOverrides() {
        this.extraOptions = {};
        this.extraBody = {};
    }

    /**
     * options（temperature, max_tokens など OpenAI互換フィールド）を組み立てる。
     * Ollamaの num_ctx はAPI経由で変更できないため意図的に無視している。
     * repeat_penalty は llama.cpp 系サーバーの拡張として素通しされることが多いが、
     * 保証はないので extraOptions 経由で明示的に渡す形にしている。
     */
    private buildParams(): Record<string, unknown> {
        const params: Record<string, unknown> = {
            temperature: this.settings.temperature,
            top_p: this.settings.topP,
            // Ollamaの num_predict: -1（無制限）は OpenAI互換APIには無いため
            // 未指定（=サーバー側デフォルト）にフォールバックする。
        };
        if (this.settings.numPredict !== undefined && this.settings.numPredict >= 0) {
            params.max_tokens = this.settings.numPredict;
        }
        if (this.settings.repeatPenalty !== undefined) {
            // llama.cpp拡張。非対応サーバーだと無視されるだけなので害はない。
            params.repeat_penalty = this.settings.repeatPenalty;
        }
        return { ...params, ...this.extraOptions };
    }

    /**
     * モデルがthinking(reasoning)を出力しそうかどうかの簡易判定。
     * LM StudioにはOllamaの /api/show 相当のAPIが無いため確実ではない。
     * モデル名によるヒューリスティックのみで、判定できない場合は null。
     */
    async supportsThinking(model: string = this.model): Promise<boolean | null> {
        if (this.capabilitiesCache.has(model)) {
            return this.capabilitiesCache.get(model)!;
        }
        const matched = LMStudioClient.REASONING_MODEL_PATTERNS.some((re) => re.test(model));
        // ヒューリスティックでヒットしなかった場合も「非対応と確定」はできないので null 扱い
        const result = matched ? true : null;
        this.capabilitiesCache.set(model, result);
        return result;
    }

    private buildBody(prompt: string): Record<string, unknown> {
        const body: Record<string, unknown> = {
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            stream: true,
            ...this.buildParams(),
        };

        // extraBody は最優先で上書き（system messageを差し込みたい場合は
        // setExtraBody({ messages: [...] }) で丸ごと上書きすること）
        return { ...body, ...this.extraBody };
    }

    /**
     * Streaming generate call against /v1/chat/completions (OpenAI-compatible, SSE形式)。
     * 呼び出しシグネチャはOllamaClient.generateTextと同一。
     * rawプロンプト文字列は messages: [{ role: "user", content: prompt }] に包んで送信する。
     */
    async generateText(
        prompt: string,
        onChunkOrOptions?: StreamCallback | GenerateTextOptions,
        signal?: AbortSignal
    ): Promise<string> {
        const opts: GenerateTextOptions =
            typeof onChunkOrOptions === "function" ? { onChunk: onChunkOrOptions } : onChunkOrOptions ?? {};
        const { onChunk, onThinking } = opts;
        const stripThinkTags = opts.stripThinkTags ?? true;
        const stripper = new ThinkTagStripper();

        const url = `${this.host.replace(/\/+$/, "")}/v1/chat/completions`;

        let res: Response;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(this.buildBody(prompt)),
                signal,
            });
        } catch (e) {
            throw new Error(
                `LM Studio (${url}) に接続できませんでした。LM Studioのローカルサーバーが起動しているか` +
                `（Developerタブ → Status: Running）確認してください。詳細: ${String(e)}`
            );
        }

        if (!res.ok) {
            const bodyText = await res.text().catch(() => "");
            throw new Error(`LM Studio がエラーを返しました (HTTP ${res.status}): ${bodyText}`);
        }

        let fullText = "";
        let fullThinking = "";

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
            const data = await res.json();
            const message = data?.choices?.[0]?.message;
            if (message?.reasoning) {
                fullThinking += message.reasoning;
                onThinking?.(fullThinking, message.reasoning);
            }
            emitResponseDelta(message?.content ?? "");
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

        const handleSseLine = (line: string) => {
            if (!line.startsWith("data:")) return;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") return;
            let chunk: { choices?: { delta?: { reasoning?: string; content?: string } }[] };
            try {
                chunk = JSON.parse(payload);
            } catch {
                return; // 不完全な行は無視
            }
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) return;

            // gpt-oss等、reasoningを分離してくれるモデルの場合はそのまま onThinking へ。
            // 分離してくれないモデルは <think> タグがcontentに混ざってくるので
            // 後段の ThinkTagStripper（emitResponseDelta内）が拾う。
            if (delta.reasoning) {
                fullThinking += delta.reasoning;
                onThinking?.(fullThinking, delta.reasoning);
            }

            emitResponseDelta(delta.content ?? "");
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
                    if (line) handleSseLine(line);
                }
            }
        } finally {
            // 後処理でリスナー解除と lock 解放
            signal?.removeEventListener("abort", onAbort);
            reader.releaseLock();
        }

        const tail = buffer.trim();
        if (tail) handleSseLine(tail);

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

    /** Basic connectivity + model existence check。checkConnection()と同じ返り値形式。 */
    async checkConnection(): Promise<{ ok: boolean; message: string }> {
        const url = `${this.host.replace(/\/+$/, "")}/v1/models`;
        try {
            const res = await fetch(url);
            if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
            const data = (await res.json()) as { data?: { id: string }[] };
            const names = (data.data ?? []).map((m) => m.id);
            if (names.length === 0) {
                return { ok: true, message: "接続成功。ただしロード済みモデルがありません（LM Studioでモデルをロードしてください）。" };
            }
            const hasModel = names.some((n) => n === this.model);
            this.log(`LM Studio接続成功。利用可能なモデル: ${names.join(", ")}`, "success");

            let thinkingNote = "";
            if (hasModel) {
                const supportsThinking = await this.supportsThinking();
                if (supportsThinking !== null) {
                    thinkingNote = supportsThinking
                        ? "（推論モデルの可能性あり・モデル名からの推定）"
                        : "";
                }
            }

            return {
                ok: true,
                message: hasModel
                    ? `接続成功。モデル "${this.model}" を利用できます。${thinkingNote}`
                    : `接続成功。ただし "${this.model}" が見つかりません。ロード済み: ${names.join(", ")}`,
            };
        } catch (e) {
            return { ok: false, message: String(e) };
        }
    }
}
