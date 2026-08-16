import type { ThinkOption } from "../core/types";

export interface OllamaGenerateChunk {
  response: string;
  /** thinkingモデルの場合、response とは別にここへ推論トレースが入ってくる。 */
  thinking?: string;
  done: boolean;
}
 
export interface OllamaShowResponse {
  capabilities?: string[];
}
 
/** Called with the full accumulated text so far, every time a new chunk arrives. */
export type StreamCallback = (fullTextSoFar: string, delta: string) => void;
 
export interface GenerateTextOptions {
  /** 通常の応答本文のストリーミングコールバック。 */
  onChunk?: StreamCallback;
  /** thinkingモデルの推論トレース（<think>相当）を別ストリームで受け取りたい場合に指定。 */
  onThinking?: StreamCallback;
  /**
   * このリクエストに限り think 設定を上書きしたい場合。省略時は setThink() で
   * 設定された値（インスタンスのデフォルト）を使用する。
   */
  think?: ThinkOption;
  /**
   * response 側に生の <think>...</think> が混入していた場合に取り除くかどうか。
   * デフォルト true。Ollama側の thinking フィールド分離が効かないケース
   * （/api/generate で think 未指定の一部モデル等）に対する防御策。
   */
  stripThinkTags?: boolean;
}
