import type { CharacterInfo, WorldInfo } from "../types";

export const outline = (
    plot: string,
    characters: CharacterInfo[],
    world: WorldInfo,
): string => `
プロット、キャラクター、世界観に基づいて、小説の詳細な章とシーンの構成（アウトライン）を作成してください。
長編小説なので、少なくとも10章以上を目指してください。
プロット: ${plot}
世界観情報: ${JSON.stringify(world)}
キャラクター詳細: ${JSON.stringify(characters)}
JSONのみを出力してください。フォーマット:
[
    {
        "chapter_title": "第1章のタイトル",
        "scenes": [
            {
                "scene_id": 1,
                "summary": "シーンの要約...",
                "characters_involved": ["キャラ1", "キャラ2"],
                "location": "場所"
            }
        ]
    }
]
全ての値は日本語で記述してください。
`;
