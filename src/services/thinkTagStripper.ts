/**
 * ストリーミング中の response テキストから <think>...</think> をリアルタイムに検出して
 * 取り除くための小さな状態機械。タグがチャンクの境界をまたいでも正しく処理できるよう、
 * タグ長分の末尾をバッファに保持してから確定分のみを流す。
 */
export class ThinkTagStripper {
    private static readonly OPEN = "<think>";
    private static readonly CLOSE = "</think>";
    private static readonly MAX_TAG_LEN = 8; // "</think>".length

    private buffer = "";
    private inThinking = false;

    /** テキストの断片を投入し、確定した clean(本文) / thinking(除去された思考部分) を返す。 */
    feed(delta: string): { clean: string; thinking: string } {
        this.buffer += delta;
        let clean = "";
        let thinking = "";

        // 1回のfeedで複数のタグが完結する可能性があるのでループする
        // (無限ループ防止のため、進捗がなければ抜ける)
        for (; ;) {
            const before = this.buffer.length;
            if (!this.inThinking) {
                const idx = this.buffer.indexOf(ThinkTagStripper.OPEN);
                if (idx === -1) {
                    const safeLen = Math.max(0, this.buffer.length - (ThinkTagStripper.MAX_TAG_LEN - 1));
                    clean += this.buffer.slice(0, safeLen);
                    this.buffer = this.buffer.slice(safeLen);
                    break;
                }
                clean += this.buffer.slice(0, idx);
                this.buffer = this.buffer.slice(idx + ThinkTagStripper.OPEN.length);
                this.inThinking = true;
            } else {
                const idx = this.buffer.indexOf(ThinkTagStripper.CLOSE);
                if (idx === -1) {
                    const safeLen = Math.max(0, this.buffer.length - (ThinkTagStripper.MAX_TAG_LEN - 1));
                    thinking += this.buffer.slice(0, safeLen);
                    this.buffer = this.buffer.slice(safeLen);
                    break;
                }
                thinking += this.buffer.slice(0, idx);
                this.buffer = this.buffer.slice(idx + ThinkTagStripper.CLOSE.length);
                this.inThinking = false;
            }
            if (this.buffer.length === before) break; // safety
        }
        return { clean, thinking };
    }

    /** ストリーム終了時に残っているバッファを吐き出す（未閉タグ等の取りこぼし防止）。 */
    flush(): { clean: string; thinking: string } {
        const remaining = this.buffer;
        this.buffer = "";
        return this.inThinking ? { clean: "", thinking: remaining } : { clean: remaining, thinking: "" };
    }
}
