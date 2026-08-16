import type { AppSettings } from "../types";

export const plot = (settings: AppSettings, idea?: string): string => {
    let prompt = `${settings.minChars}文字から${settings.maxChars}文字程度の長編小説のプロットを詳細に作成してください。`;
    if (idea) prompt += `\n初期のアイデア: ${idea}`;
    return prompt + "\n起承転結を含め、物語の始まり、中間、結末を記述してください。主要な対立と解決についても記述してください。出力はすべて日本語で行ってください。";
};
