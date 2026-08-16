import { Config } from "../config";
import type { FsManager } from "../../services/fsManager";
import type { CharacterInfo, CharacterState, NovelState, LogFn } from "./types";
import { Prompts } from "./prompts";
import { parseJsonLoose } from "./jsonUtils";

export class StateManager {
    private fs: FsManager;
    private generateText: (prompt: string, signal?: AbortSignal) => Promise<string>;
    private log: LogFn;

    constructor(
        fs: FsManager,
        generateText: (prompt: string, signal?: AbortSignal) => Promise<string>,
        log: LogFn
    ) {
        this.fs = fs;
        this.generateText = generateText;
        this.log = log;
    }

    async saveSnapshot(state: NovelState, sceneId: number, suffix: string = ""): Promise<void> {
        await this.fs.writeJSON(`${Config.SNAPSHOTS_DIR}/state_${sceneId}${suffix}.json`, state);
    }

    async loadSnapshot(sceneId: number): Promise<NovelState | null> {
        return this.fs.readJSON<NovelState>(`${Config.SNAPSHOTS_DIR}/state_${sceneId}.json`);
    }

    async updateState(
        sceneText: string,
        oldState: NovelState,
        characters: CharacterInfo[],
        signal?: AbortSignal
    ): Promise<NovelState> {
        this.log("状態を更新中...", "info");
        const prompt = Prompts.updateState(sceneText, oldState, characters);
        const response = await this.generateText(prompt, signal);

        try {
            return parseJsonLoose<NovelState>(response);
        } catch {
            this.log("状態更新JSONの解析に失敗しました。既存の状態を維持します。", "error");
            console.log(response);
            return oldState;
        }
    }

    async reconstructState(
        targetSceneId: number,
        characters: CharacterInfo[],
        signal?: AbortSignal
    ): Promise<NovelState | null> {
        this.log(`シーン ${targetSceneId} まで状態を再構築中...`, "info");
        let currentState: NovelState = { characters: {}, flags: {} };
        let startIndex = 1;

        for (let i = targetSceneId - 1; i >= 1; i--) {
            const snapshot = await this.loadSnapshot(i);
            if (snapshot) {
                this.log(`シーン ${i} のスナップショットを発見。シーン ${i + 1} から再開します。`, "info");
                currentState = snapshot;
                startIndex = i + 1;
                break;
            }
        }

        for (let i = startIndex; i <= targetSceneId; i++) {
            const sceneFile = `${Config.DRAFTS_DIR}/scene_${i}.md`;
            if (!(await this.fs.exists(sceneFile))) {
                this.log(`シーン ${i} が見つかりません。再構築を中断します。`, "warn");
                return null;
                break;
            }
            this.log(`シーン ${i} を処理中...`, "info");
            try {
                const sceneText = await this.fs.readText(sceneFile);
                currentState = await this.updateState(sceneText, currentState, characters, signal);
                await this.saveSnapshot(currentState, i);
            } catch {
                this.log(`シーン ${i} の読み込みに失敗したため、再構築を中断しました。`, "warn");
                return null;
            }
        }

        this.log("状態の再構築が完了しました。", "success");
        return currentState;
    }
}

export function emptyCharacterState(): CharacterState {
    return { location: "", status: "", inventory: [], experience_log: [] };
}
