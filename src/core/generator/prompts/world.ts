export const world = (plot: string)
    : string => `
以下のプロットに基づいて、世界観の設定をJSON形式で作成してください。
location_names（地名リスト）, history（歴史）, magic_system（魔法や技術体系、もしあれば）, important_rules（重要なルール）を含めてください。
プロット:
${plot}
JSONのみを出力してください。フォーマット:
{
    "location_names": ["地名1", "地名2"],
    "history": "歴史の概要...",
    "magic_system": "説明...",
    "important_rules": "ルール..."
}
全ての値は日本語で記述してください。
`;
