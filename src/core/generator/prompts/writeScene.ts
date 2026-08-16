import type { AppSettings, CharacterInfo, NovelState, SceneOutline, WorldInfo } from "../types";

export const writeScene = (
    sceneInfo: SceneOutline,
    previousSummary: string,
    characters: CharacterInfo[],
    world: WorldInfo,
    currentState: NovelState,
    settings: AppSettings
): string => {
    const note = Array.isArray(sceneInfo.note) ? sceneInfo.note.filter(Boolean).join("\n") : sceneInfo.note ?? "";
    return `
小説のシーンを執筆してください。
シーン要約: ${sceneInfo.summary}
場所: ${sceneInfo.location}
登場人物: ${sceneInfo.characters_involved.join(", ")}
直前のコンテキスト: ${previousSummary}
現在の状態と経験（これまでの経緯）:
${JSON.stringify(currentState)}
世界観情報: ${JSON.stringify(world)}
キャラクター詳細: ${JSON.stringify(characters)}
物語調で、描写豊かに日本語で執筆してください。
セリフを生成するときは、キャラクターの一人称、二人称の設定を厳守してください。
セリフ例はあくまでも例です。口調や話し方だけを参考にしてセリフ例をそのまま流用しないこと。必ずその場面に即したセリフを生成してください。
**視点設定**: ${settings.viewpoint} を厳守し、シーン内で不自然に視点を切り替えないでください。
**文体・スタイル**: ${settings.style}
**シーンごとの補足**:${note}
`;
};
