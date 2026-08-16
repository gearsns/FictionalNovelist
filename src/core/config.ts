import type { AppSettings } from "./types";

// File / directory naming, mirroring the original Python Config module.
export const Config = {
    PLOT_FILE: "plot.md",
    IDEA_FILE: "idea.txt",
    CHARACTERS_FILE: "characters.json",
    WORLD_FILE: "world.json",
    OUTLINE_FILE: "outline.json",
    DRAFTS_DIR: "drafts",
    CONVERT_DIR: "convert",
    SNAPSHOTS_DIR: "state_snapshots",
    SETTINGS_FILE: "fictional-novelist.settings.json",
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
    provider: "ollama",
    host: "http://127.0.0.1:11434",
    apiKey: "",
    model: "llama3.1",
    viewpoint: "三人称視点（一人の主人公に寄り添う三人称限定視点）",
    style: "情景描写を丁寧に、会話は生き生きと。一文は短すぎず長すぎず、テンポよく。",
    minChars: 70000,
    maxChars: 100000,
    temperature: 0.8,
    numCtx: 8192,
    numPredict: -1,
    topP: 0.9,
    repeatPenalty: 1.1,
    think: undefined, // = 自動
};
