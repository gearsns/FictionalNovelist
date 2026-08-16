import type { CharacterInfo, NovelState } from "../types";

export const updateState = (
    sceneText: string, oldState: NovelState, characters: CharacterInfo[]
): string => {
    const charNames = characters.map((c) => c.name);
    return `
以下のシーンと現在の状態に基づいて、状態を更新してください。
特に、キャラクターの場所、健康状態、所持品の変化、および**重要な経験/記憶**を記録してください。
「experience_log」は、物語全体の整合性を保つために、キャラクターが何を経験し、誰と会い、何を知ったかを累積して記録する重要なフィールドです。
既存のログに新しい経験を追加してください。
シーン:
${sceneText}
現在の状態:
${JSON.stringify(oldState)}
キャラクターリスト:
${JSON.stringify(charNames)}
JSONのみを出力してください。フォーマット:
{
    "characters": {
        "CharacterName": {
            "location": "現在地",
            "status": "健康状態など",
            "inventory": ["アイテム1", "アイテム2"],
            "experience_log": ["過去の経験...", "今回のシーンでの経験..."]
        }
    },
    "flags": {
        "plot_flag_name": true
    }
}
全ての値は日本語で記述してください。
`;
}
