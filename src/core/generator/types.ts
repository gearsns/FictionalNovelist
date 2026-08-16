// --- アプリケーション設定 ---
export interface AppSettings {
    minChars: number;
    maxChars: number;
    viewpoint: string; // 例: "三人称視点", "主人公の一人称"
    style: string;     // 例: "ライトノベル風", "硬派な文体"
}

// --- ログ出力関数 ---
export type LogLevel = "info" | "warn" | "error" | "success";
export type LogFn = (message: string, level: LogLevel) => void;

// --- キャラクター関連 ---
export interface CharacterInfo {
    name: string;
    age: string;
    role: string;
    personality: string;
    first_person: string;
    second_person: string;
    speech_examples: string[];
}

export interface CharacterState {
    location: string;
    status: string;
    inventory: string[];
    experience_log: string[];
}

// --- 世界観関連 ---
export interface WorldInfo {
    location_names: string[];
    history: string;
    magic_system: string;
    important_rules: string;
}

// --- アウトライン／シーン構成 ---
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

// --- 物語の進行状態 ---
export interface NovelState {
    characters: Record<string, CharacterState>;
    flags: Record<string, boolean>;
}
