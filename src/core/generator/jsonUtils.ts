import type { Outline } from "./types";
import { jsonrepair } from 'jsonrepair';

function fixBrackets(input: string): string {
    const stack: string[] = [];
    const result: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (inString) {
            result.push(char);
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            result.push(char);
        } else if (char === '{' || char === '[') {
            stack.push(char);
            result.push(char);
        } else if (char === '}' || char === ']') {
            if (stack.length > 0) {
                const lastOpen = stack.pop()!;
                result.push(lastOpen === '{' ? '}' : ']');
            }
            // 対応する開き括弧がない場合は捨てる(元の挙動を維持)
        } else if (char === '.' && input[i + 1] === '{') {
            result.push(',');
        } else {
            result.push(char);
        }
    }

    while (stack.length > 0) {
        const lastOpen = stack.pop()!;
        result.push(lastOpen === '{' ? '}' : ']');
    }

    return result.join('');
}

function safeParseJSON(text: string) {
    // Markdownのコードフェンスを除去
    const cleaned = text.replace(/```json|```/g, '').trim();
    const strategies = [
        (s: string) => s,
        (s: string) => jsonrepair(s),
        (s: string) => jsonrepair(fixBrackets(s)),
    ];

    let lastError: unknown;
    for (const strategy of strategies) {
        try {
            return JSON.parse(strategy(cleaned));
        } catch (e) {
            lastError = e;
        }
    }

    console.error('修復不能なJSON:', lastError, cleaned);
    throw lastError;
}

export function cleanJsonResponse(response: string): string {
    let text = response.trim();
    if (text.includes("```json")) {
        text = text.split("```json")[1]?.split("```")[0] ?? text;
    } else if (text.includes("```")) {
        text = text.split("```")[1]?.split("```")[0] ?? text;
    }
    return text.trim();
}

export function parseJsonLoose<T>(response: string): T {
    const cleaned = cleanJsonResponse(response);
    try {
        return safeParseJSON(cleaned) as T;
    } catch {
        const objMatch = cleaned.match(/[[{][\s\S]*[\]}]/);
        if (objMatch) {
            return safeParseJSON(objMatch[0]) as T;
        }
        throw new Error("JSONの解析に失敗しました");
    }
}

export function renumberSceneIds(outline: Outline): Outline {
    let currentSceneId = 1;
    for (const chapter of outline) {
        for (const scene of chapter.scenes ?? []) {
            scene.scene_id = currentSceneId;
            currentSceneId += 1;
        }
    }
    return outline;
}
