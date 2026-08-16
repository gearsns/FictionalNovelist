/**
 * markdownToKakuyomu.ts
 *
 * Markdown（拡張記法つき）から「カクヨム」記法へ変換する処理。
 *
 * 対応する拡張記法:
 *   - ルビ:   R[漢字](かんじ)      → |漢字《かんじ》
 *   - 圏点:   ・・強調したい語・・  → 《《強調したい語》》
 *
 * カクヨム記法の仕様（公式ヘルプより）:
 *   - ルビ: 親文字の直前に｜（全角）または|（半角）を置き、直後を
 *           《ルビ文字》でくくる。親文字が漢字のみの場合は｜を省略できるが、
 *           誤爆を避けるため本実装では常に付与する。
 *           例: 冴えない彼女《ヒロイン》の育てかた / あいつの｜etc《えとせとら》
 *   - 傍点（圏点）: 対象文字列を《《 》》で二重にくくるだけでよい。
 *           なろうと違い「・」を文字数分並べる必要はない。
 *           例: おじいさんは山へ《《柴刈り》》に出かけました。
 *   - 注意: カクヨムでは「ルビ」と「傍点」を同じ範囲に同時に振ることはできない。
 *           また、いずれの記法も改行をまたぐと無効になる。
 */

import {
    convertRubySyntax,
    convertKutenSyntax,
    stripBasicMarkdown,
    type ConvertOptions,
} from "./webNovelCommon";

/** ルビ記法の変換: R[漢字](かんじ) → |漢字《かんじ》 */
function convertRuby(markdown: string): string {
    return convertRubySyntax(markdown, (base, ruby) => `|${base}《${ruby}》`);
}

/** 傍点（圏点）記法の変換: ・・強調したい語・・ → 《《強調したい語》》 */
function convertKuten(markdown: string): string {
    return convertKutenSyntax(markdown, (target) => `《《${target}》》`);
}

/**
 * Markdown（拡張ルビ/圏点記法つき）をカクヨム記法のテキストに変換する。
 *
 * 変換順序が重要:
 *   1. ルビ記法 R[漢字](かんじ) を変換
 *   2. 圏点記法 ・・text・・ を変換
 *      （ルビ変換で生成された |《》 は圏点パターンにマッチしないため順序は安全）
 *   3. 必要であれば一般的なMarkdown装飾を除去
 *
 * 注意: 同一箇所にルビと傍点の両方を指定するMarkdownを書いた場合、
 * カクヨム側の仕様上どちらも有効になりません。入力側で重複させないこと。
 */
export function convertMarkdownToKakuyomu(
    markdown: string,
    options: ConvertOptions = {}
): string {
    const { stripMarkdown = true } = options;

    let text = markdown;
    text = convertRuby(text);
    text = convertKuten(text);
    if (stripMarkdown) {
        text = stripBasicMarkdown(text);
    }
    return text;
}
