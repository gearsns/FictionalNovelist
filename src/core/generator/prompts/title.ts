export const title = (sceneText: string): string => {
    const truncated = sceneText.length > 2000;
    const excerpt = sceneText.slice(0, 2000) + (truncated ? "... (省略)" : "");
    return `
以下の小説のシーンに、内容を端的に表す魅力的なタイトル（日本語）を付けてください。
「第○話」のような番号は含めず、タイトルのみを出力してください。
シーン:
${excerpt}
`;
};
