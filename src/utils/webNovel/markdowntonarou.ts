/**
 * markdownToNarou.ts
 *
 * Markdown（拡張記法つき）から「小説家になろう」記法へ変換する処理。
 *
 * 対応する拡張記法:
 *   - ルビ:   R[漢字](かんじ)      → |漢字《かんじ》
 *   - 圏点:   ・・強調したい語・・  → |強調したい語《・・・・》（文字数分の「・」）
 *
 * なろう記法の仕様:
 *   - ルビ: |対象文字《ルビ文字》  （対象が漢字のみなら | は省略可能だが、
 *            誤爆を避けるため本実装では常に | を付与する）
 *   - 圏点: なろうには圏点専用タグが無いため、対象文字と同じ文字数の「・」を
 *            ルビとして振ることで擬似的に圏点を再現するのが一般的な手法。
 */

import {
    countGraphemes,
    convertRubySyntax,
    convertKutenSyntax,
    stripBasicMarkdown,
    type ConvertOptions,
} from "./webNovelCommon";

/** ルビ記法の変換: R[漢字](かんじ) → |漢字《かんじ》 */
function convertRuby(markdown: string): string {
    return convertRubySyntax(markdown, (base, ruby) => `|${base}《${ruby}》`);
}

/**
 * 圏点記法の変換: ・・強調したい語・・ → |強調したい語《・・・・》
 * 対象文字列の文字数と同じ数だけ「・」を並べてルビとして振る。
 */
function convertKuten(markdown: string): string {
    return convertKutenSyntax(markdown, (target) => {
        const dots = "・".repeat(countGraphemes(target));
        return `|${target}《${dots}》`;
    });
}

/**
 * Markdown（拡張ルビ/圏点記法つき）を小説家になろう記法のテキストに変換する。
 *
 * 変換順序が重要:
 *   1. ルビ記法 R[漢字](かんじ) を変換
 *   2. 圏点記法 ・・text・・ を変換
 *      （ルビ変換で生成された |《》 は圏点パターンにマッチしないため順序は安全）
 *   3. 必要であれば一般的なMarkdown装飾を除去
 */
export function convertMarkdownToNarou(
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
