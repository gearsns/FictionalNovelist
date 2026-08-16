export const characters = (plot: string): string => `
以下のプロットに基づいて、登場人物のリストをJSON形式で作成してください。
各キャラクターには以下の項目を含めてください：
- name（名前）
- age（年齢）
- role（役割）
- personality（性格）
- first_person（一人称: 私、俺、僕など）
- second_person（二人称: あなた、お前、君など）
- speech_examples（セリフ例: そのキャラらしいセリフを3〜5個）
**重要な指示**: プロット内で「父」「姉」「過去の師匠」などの言及がある場合、回想のみの登場であっても**必ず名前を創作して**リストに含めてください。作中に名前のない重要人物（「誰かの親族」など）を残さないでください。
プロット:
${plot}
JSONのみを出力してください。フォーマット:
[
    {
        "name": "名前",
        "age": "年齢",
        "role": "役割",
        "personality": "性格",
        "first_person": "一人称",
        "second_person": "二人称",
        "speech_examples": ["セリフ例1", "セリフ例2"]
    }
]
全ての値は日本語で記述してください。
`;
