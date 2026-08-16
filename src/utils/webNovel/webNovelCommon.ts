/**
 * webNovelCommon.ts
 *
 * 「小説家になろう」「カクヨム」など、Web小説投稿サイト向けの
 * 記法変換で共通して使うユーティリティ関数。
 */

/** Unicodeのサロゲートペア・結合文字を考慮して「見た目の文字数」を数える */
export function countGraphemes(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text)).length;
  }
  // フォールバック: コードポイント単位でカウント（サロゲートペア対応）
  return Array.from(text).length;
}

/**
 * ルビ/傍点記法で特別な意味を持つ記号 | 《 》 が対象文字列に
 * 含まれていた場合に、記法として誤爆しないよう見た目の近い文字に退避する。
 *
 * 本来は「｜《」のように｜でエスケープする専用の書き方があるが、
 * ルビの親文字・ルビ文字・傍点の対象文字列という「入れ子の中」で使うと
 * 逆に解釈が崩れるため、ここでは単純に代替文字への置換で対応する。
 */
export function escapeSpecialChars(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "￤") // 半角縦棒 → 全角相当の記号に退避
    .replace(/｜/g, "￤") // 全角縦棒も同様に退避
    .replace(/《/g, "〈")
    .replace(/》/g, "〉");
}

/**
 * Markdownの基本的な装飾要素を、投稿サイトの本文向けにプレーンテキストへ落とす。
 * なろう・カクヨムともに見出し記号や強調記号などのMarkdown構文は解釈しないため。
 */
export function stripBasicMarkdown(markdown: string): string {
  return markdown
    // 見出し "# 見出し" → "見出し"
    .replace(/^#{1,6}\s+/gm, "")
    // 太字/斜体 **text** / *text* / __text__ / _text_ → text
    .replace(/(\*\*\*|___)(.+?)\1/g, "$2")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    // 打ち消し線 ~~text~~ → text
    .replace(/~~(.+?)~~/g, "$1")
    // インラインコード `code` → code
    .replace(/`([^`]+)`/g, "$1")
    // 水平線
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "");
}

/**
 * 拡張Markdownのルビ記法 R[漢字](かんじ) を検出して変換する共通処理。
 * @param markdown 変換対象のテキスト
 * @param format   マッチした親文字・ルビ文字から出力形式を組み立てる関数
 */
export function convertRubySyntax(
  markdown: string,
  format: (base: string, ruby: string) => string
): string {
  const rubyPattern = /R\[([^\]]+)\]\(([^)]+)\)/g;
  return markdown.replace(rubyPattern, (_match, base: string, ruby: string) => {
    return format(escapeSpecialChars(base), escapeSpecialChars(ruby));
  });
}

/**
 * 拡張Markdownの圏点記法 ・・text・・ を検出して変換する共通処理。
 * @param markdown 変換対象のテキスト
 * @param format   マッチした対象文字列から出力形式を組み立てる関数
 */
export function convertKutenSyntax(
  markdown: string,
  format: (target: string) => string
): string {
  // ・・ ... ・・ を非貪欲マッチ。改行はまたがない。
  const kutenPattern = /・・([^\n]+?)・・/g;
  return markdown.replace(kutenPattern, (_match, target: string) => {
    return format(escapeSpecialChars(target));
  });
}

export interface ConvertOptions {
  /** 見出しや強調などの一般的なMarkdown記法も除去するか（既定: true） */
  stripMarkdown?: boolean;
}
