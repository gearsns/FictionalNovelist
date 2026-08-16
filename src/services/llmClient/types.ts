import type { ThinkOption } from "../../core/types";
import type { GenerateTextOptions, StreamCallback } from "../types";

/**
 * バックエンド（Ollama / LM Studio）に依存しない共通インターフェース。
 * 呼び出し側はこの型だけを見て操作すればよく、具象クラス（OllamaClient /
 * LMStudioClient）の違いを一切意識しなくてよい。
 *
 * generateText のシグネチャは変更していない（両実装で完全に同一）。
 */
export interface LLMClient {
    setHost(host: string): void;
    setModel(model: string): void;
    setAPIKey(key: string): void;
    setThink(think: ThinkOption | undefined): void;
    setExtraOptions(options: Record<string, unknown>): void;
    setExtraBody(body: Record<string, unknown>): void;
    resetOverrides(): void;

    /**
     * thinking capability の判定。
     * Ollama: /api/show の capabilities で確実に判定（true/false）。
     * LM Studio: 確実なAPIが無いためモデル名のヒューリスティック判定
     *   （ヒットすれば true、ヒットしなければ null=不明）。
     * どちらの実装でも「わからない場合は null」という契約は共通。
     */
    supportsThinking(model?: string): Promise<boolean | null>;

    generateText(
        prompt: string,
        onChunkOrOptions?: StreamCallback | GenerateTextOptions,
        signal?: AbortSignal
    ): Promise<string>;

    checkConnection(): Promise<{ ok: boolean; message: string }>;
}

