import type { AppSettings, LogFn, ThinkOption } from "../../core/types";
import type { GenerateTextOptions, StreamCallback } from "../types";
import { OllamaClient } from "./ollamaClient";
import { LMStudioClient } from "./lmStudioClient";
import type { LLMClient } from "./types";

export type { StreamCallback, LLMClient };

export type LLMProvider = "ollama" | "lmstudio";

/**
 * provider に応じて適切な実装を生成するファクトリ。
 * 呼び出し側はこの関数経由でクライアントを取得し、以降は LLMClient 型の
 * 変数として扱う（OllamaClient / LMStudioClient を直接importする必要はない）。
 *
 * 例:
 *   const client = createLLMClient(settings.provider, settings.host, settings.model, log, settings);
 *   await client.generateText(prompt, { onChunk, onThinking });
 */
export function createLLMClient(
    provider: LLMProvider,
    host: string,
    key: string,
    model: string,
    log: LogFn,
    settings: AppSettings
): LLMClient {
    switch (provider) {
        case "ollama":
            return new OllamaClient(host, key, model, log, settings);
        case "lmstudio":
            return new LMStudioClient(host, key, model, log, settings);
        default: {
            // provider に新しい値を追加し忘れた場合にコンパイルエラーで気づけるようにする
            const exhaustiveCheck: never = provider;
            throw new Error(`未知のprovider: ${String(exhaustiveCheck)}`);
        }
    }
}

/**
 * provider を実行時に切り替え可能な LLMClient。
 *
 * createLLMClient() が返す具象インスタンスは provider 固定だが、
 * 設定画面で provider を変更するたびに呼び出し側で client 変数を
 * 作り直すのは面倒＆呼び出し側が provider を意識することになるため、
 * その差し替えロジックをこのクラスの中に閉じ込める。
 *
 * 呼び出し側はアプリ起動時に一度だけ SwitchableLLMClient を生成して
 * 保持し、以降は LLMClient として使い続ければよい。設定で provider が
 * 変わったときだけ setProvider() を呼ぶ（host/model/think等の他の設定は
 * 保持されたまま実装だけ入れ替わる）。
 *
 * 例:
 *   const client = new SwitchableLLMClient(settings.provider, settings.host, settings.model, log, settings);
 *   // 設定画面で provider が変更されたら
 *   client.setProvider(newProvider);
 *   // 呼び出し側はこの後も同じ client を使い続けるだけでよい
 *   await client.generateText(prompt, { onChunk });
 */
export class SwitchableLLMClient implements LLMClient {
    private impl: LLMClient;
    private provider: LLMProvider;
    private host: string;
    private apiKey: string;
    private model: string;
    private log: LogFn;
    private settings: AppSettings;

    constructor(provider: LLMProvider, key: string, host: string, model: string, log: LogFn, settings: AppSettings) {
        this.provider = provider;
        this.host = host;
        this.apiKey = key;
        this.model = model;
        this.log = log;
        this.settings = settings;
        this.impl = createLLMClient(provider, key, host, model, log, settings);
    }

    /**
     * provider を切り替える。host/model は保持したまま新しい実装を生成し直す。
     * think/extraOptions/extraBody は実装ごとに意味が異なりうるため
     * 引き継がない（新実装はデフォルト状態から始まる）。必要なら
     * setProvider() の後に呼び出し側で setThink() 等を再設定すること。
     */
    setProvider(provider: LLMProvider) {
        if (provider === this.provider) return;
        this.provider = provider;
        this.impl = createLLMClient(provider, this.host, this.apiKey, this.model, this.log, this.settings);
    }

    getProvider(): LLMProvider {
        return this.provider;
    }

    setHost(host: string) {
        this.host = host;
        this.impl.setHost(host);
    }

    setAPIKey(key: string) {
        this.apiKey = key;
        this.impl.setAPIKey(key);
    }

    setModel(model: string) {
        this.model = model;
        this.impl.setModel(model);
    }

    setThink(think: ThinkOption | undefined) {
        this.impl.setThink(think);
    }

    setExtraOptions(options: Record<string, unknown>) {
        this.impl.setExtraOptions(options);
    }

    setExtraBody(body: Record<string, unknown>) {
        this.impl.setExtraBody(body);
    }

    resetOverrides() {
        this.impl.resetOverrides();
    }

    supportsThinking(model?: string): Promise<boolean | null> {
        return this.impl.supportsThinking(model);
    }

    generateText(
        prompt: string,
        onChunkOrOptions?: StreamCallback | GenerateTextOptions,
        signal?: AbortSignal
    ): Promise<string> {
        return this.impl.generateText(prompt, onChunkOrOptions, signal);
    }

    checkConnection(): Promise<{ ok: boolean; message: string }> {
        return this.impl.checkConnection();
    }
}
