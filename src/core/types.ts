// Domain types mirroring the original Python state files.

/**
 * Ollama's `think` field. Most thinking models (Qwen3系, DeepSeek-R1など) accept
 * true/false. gpt-oss系は "low" | "medium" | "high" のレベル指定のみを受け付け、
 * false を渡しても完全には無効化できない点に注意。
 * See: https://ollama.com/blog/thinking
 */
export type ThinkOption = boolean | "low" | "medium" | "high" | "max";
export type ProviderOption = "ollama" | "lmstudio";
export type ConvertTypeOption = "narou" | "kakuyomu";
export interface CharacterInfo {
    name: string;
    age: string;
    role: string;
    personality: string;
    first_person: string;
    second_person: string;
    speech_examples: string[];
}

export interface WorldInfo {
    location_names: string[];
    history: string;
    magic_system: string;
    important_rules: string;
}

export interface SceneOutline {
    scene_id: number;
    summary: string;
    characters_involved: string[];
    location: string;
    note?: string[];
}

export interface ChapterOutline {
    chapter_title: string;
    scenes: SceneOutline[];
}

export type Outline = ChapterOutline[];

export interface CharacterState {
    location: string;
    status: string;
    inventory: string[];
    experience_log: string[];
}

export interface NovelState {
    characters: Record<string, CharacterState>;
    flags: Record<string, boolean>;
}

export interface AppSettings {
    provider: ProviderOption;
    host: string;
    apiKey: string;
    model: string;
    viewpoint: string;
    style: string;
    minChars: number;
    maxChars: number;
    /** Sampling temperature passed as options.temperature. */
    temperature: number;
    /** Context window size passed as options.num_ctx. Must be large enough to hold the whole prompt (state/characters/world/previous summary) plus the scene being generated. */
    numCtx: number;
    /** Max tokens to generate, passed as options.num_predict. -1 = no limit (let the model finish naturally). A too-low value is a common cause of generation stopping mid-sentence. */
    numPredict: number;
    /** Nucleus sampling, passed as options.top_p. */
    topP: number;
    /** Repetition penalty, passed as options.repeat_penalty. */
    repeatPenalty: number;

    think: ThinkOption | undefined;
}

export type LogLevel = "info" | "success" | "error" | "warn";
export type LogFn = (message: string, level?: LogLevel) => void;
