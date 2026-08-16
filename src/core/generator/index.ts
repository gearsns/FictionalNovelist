import type { LLMClient, StreamCallback } from "../../services/llmClient";
import { Config } from "../config";
import type { FsManager } from "../../services/fsManager";
import type {
    AppSettings,
    CharacterInfo,
    NovelState,
    Outline,
    SceneOutline,
    WorldInfo,
    LogFn,
} from "./types";
import { Prompts } from "./prompts";
import { parseJsonLoose, renumberSceneIds } from "./jsonUtils";
import { StateManager } from "./stateManager";

export { renumberSceneIds };

export class Generator {
    private stateManager: StateManager;
    private fs: FsManager;
    private llm: LLMClient;
    private settings: AppSettings;
    private log: LogFn;
    private onStream?: StreamCallback;

    constructor(
        fs: FsManager,
        llm: LLMClient,
        settings: AppSettings,
        log: LogFn,
        onStream?: StreamCallback
    ) {
        this.fs = fs;
        this.llm = llm;
        this.settings = settings;
        this.log = log;
        this.onStream = onStream;
        this.stateManager = new StateManager(
            this.fs,
            (prompt, signal) => this.generateText(prompt, signal),
            this.log
        );
    }

    updateSettings(settings: AppSettings) {
        this.settings = settings;
    }

    private generateText(prompt: string, signal?: AbortSignal): Promise<string> {
        return this.llm.generateText(prompt, {
            onChunk: this.onStream,
            onThinking: this.onStream,
        }, signal);
    }

    async generatePlot(idea?: string, signal?: AbortSignal): Promise<string> {
        this.log("プロットを生成中...", "info");
        const prompt = Prompts.plot(this.settings, idea);
        const plot = await this.generateText(prompt, signal);
        await this.fs.writeText(Config.PLOT_FILE, plot);
        return plot;
    }

    async generateCharacters(plot: string, signal?: AbortSignal): Promise<CharacterInfo[]> {
        this.log("キャラクターを生成中...", "info");
        const prompt = Prompts.characters(plot);
        const response = await this.generateText(prompt, signal);
        try {
            const characters = parseJsonLoose<CharacterInfo[]>(response);
            await this.fs.writeJSON(Config.CHARACTERS_FILE, characters);
            return characters;
        } catch {
            this.log("キャラクターJSONの解析に失敗しました。生データを保存します。", "error");
            await this.fs.writeText("characters_raw.txt", response);
            return [];
        }
    }

    async generateWorld(plot: string, signal?: AbortSignal): Promise<WorldInfo> {
        this.log("世界観を生成中...", "info");
        const prompt = Prompts.world(plot);
        const response = await this.generateText(prompt, signal);
        try {
            const world = parseJsonLoose<WorldInfo>(response);
            await this.fs.writeJSON(Config.WORLD_FILE, world);
            return world;
        } catch {
            this.log("世界観JSONの解析に失敗しました。生データを保存します。", "error");
            await this.fs.writeText("world_raw.txt", response);
            return { location_names: [], history: "", magic_system: "", important_rules: "" };
        }
    }

    async generateOutline(
        plot: string,
        characters: CharacterInfo[],
        world: WorldInfo,
        signal?: AbortSignal
    ): Promise<Outline> {
        this.log("アウトラインを生成中...", "info");
        const prompt = Prompts.outline(plot, characters, world);
        const response = await this.generateText(prompt, signal);
        try {
            const outline = parseJsonLoose<Outline>(response);
            renumberSceneIds(outline);
            await this.fs.writeJSON(Config.OUTLINE_FILE, outline);
            return outline;
        } catch {
            this.log("アウトラインJSONの解析に失敗しました。生データを保存します。", "error");
            await this.fs.writeText("outline_raw.txt", response);
            return [];
        }
    }

    async writeScene(
        sceneInfo: SceneOutline,
        previousSummary: string,
        characters: CharacterInfo[],
        world: WorldInfo,
        currentState: NovelState,
        signal?: AbortSignal
    ): Promise<string> {
        this.log(`シーン ${sceneInfo.scene_id} を執筆中...`, "info");
        const prompt = Prompts.writeScene(sceneInfo, previousSummary, characters, world, currentState, this.settings);
        return await this.generateText(prompt, signal);
    }

    async summarizeScene(sceneText: string, signal?: AbortSignal): Promise<string> {
        return await this.generateText(Prompts.summarizeScene(sceneText), signal);
    }

    async generateTitle(sceneText: string, signal?: AbortSignal): Promise<string> {
        const title = await this.generateText(Prompts.title(sceneText), signal);
        return title.trim();
    }

    // --- State Delegate Methods ---
    updateState(sceneText: string, oldState: NovelState, characters: CharacterInfo[], signal?: AbortSignal) {
        return this.stateManager.updateState(sceneText, oldState, characters, signal);
    }

    reconstructState(targetSceneId: number, characters: CharacterInfo[], signal?: AbortSignal) {
        return this.stateManager.reconstructState(targetSceneId, characters, signal);
    }

    saveStateSnapshot(state: NovelState, sceneId: number, suffix: string = "") {
        return this.stateManager.saveSnapshot(state, sceneId, suffix);
    }

    loadStateSnapshot(sceneId: number) {
        return this.stateManager.loadSnapshot(sceneId);
    }
}
