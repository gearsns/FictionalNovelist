export const summarizeScene = (sceneText: string): string =>
    `
以下のシーンを3〜4文で要約してください。重要な出来事とキャラクターの状態変化に焦点を当ててください。
出力は日本語で行ってください。
シーン:
${sceneText}
`;
