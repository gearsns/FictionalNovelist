import { DEFAULT_SETTINGS } from "../core/config";
import type { AppSettings, LogLevel, Outline } from "../core/types";

export interface AppState {
    settings: AppSettings;
    lastOutline: Outline | null;
    ideaFileText: string;
    busy: boolean;
    abortController?: AbortController;
    markdownViewMode: "split" | "editor" | "preview";
    editorLoaded: boolean;
}

export const state: AppState = {
    settings: { ...DEFAULT_SETTINGS },
    lastOutline: null,
    ideaFileText: "",
    busy: false,
    markdownViewMode: "split",
    editorLoaded: false,
};

export type LogFunction = (msg: string, level?: LogLevel) => void;
