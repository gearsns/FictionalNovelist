import { Config } from "./config";
import type { FsManager } from "../services/fsManager";
import type { Generator } from "./generator";
import type {
    CharacterInfo,
    NovelState,
    Outline,
    WorldInfo,
    LogFn,
    SceneOutline,
    ChapterOutline,
} from "./types";

const DEFAULT_WORLD_INFO: WorldInfo = {
    location_names: [],
    history: "",
    magic_system: "",
    important_rules: "",
};
export class Controller {
    private fs: FsManager;
    private gen: Generator;
    private log: LogFn;

    constructor(fs: FsManager, gen: Generator, log: LogFn) {
        this.fs = fs;
        this.gen = gen;
        this.log = log;
    }

    // --- command: init -------------------------------------------------------

    async runInit(idea: string | undefined, rewrite: boolean, signal?: AbortSignal): Promise<void> {
        let plot: string;
        if (!this.fs.isReady) return;
        try {
            if (idea) {
                await this.fs.writeText(Config.IDEA_FILE, idea);
            }
        } catch (e) {
            this.log(`設定の保存に失敗しました: ${String((e as Error).message ?? e)}`, "error");
            return;
        }
        if (signal?.aborted) return;

        if (!rewrite && await this.fs.exists(Config.PLOT_FILE)) {
            this.log("プロットファイルは既に存在します。プロット生成をスキップします。", "warn");
            plot = await this.fs.readText(Config.PLOT_FILE);
        } else {
            if (!idea) {
                throw new Error("アイデアを入力するか、アイデアファイルを選択してください。");
            }
            plot = await this.gen.generatePlot(idea, signal);
            this.log("プロットを生成しました。", "success");
        }
        if (signal?.aborted) return;

        if (!rewrite && await this.fs.exists(Config.CHARACTERS_FILE)) {
            this.log("キャラクターファイルは既に存在します。スキップします。", "warn");
        } else {
            await this.gen.generateCharacters(plot, signal);
            this.log("キャラクターを生成しました。", "success");
        }
        if (signal?.aborted) return;

        if (!rewrite && await this.fs.exists(Config.WORLD_FILE)) {
            this.log("世界観ファイルは既に存在します。スキップします。", "warn");
        } else {
            await this.gen.generateWorld(plot, signal);
            this.log("世界観を生成しました。", "success");
        }

        this.log("初期化が完了しました。生成されたファイルを確認してください。", "success");
    }

    // --- command: outline -----------------------------------------------------

    async runOutline(signal?: AbortSignal): Promise<Outline> {
        this.log("アウトラインを生成を開始します...", "info");
        if (!(await this.fs.exists(Config.PLOT_FILE))) {
            throw new Error("プロットが見つかりません。先に「初期化」を実行してください。");
        }
        const plot = await this.fs.readText(Config.PLOT_FILE).catch(() => "");
        if (!plot) throw new Error("プロットが見つかりません。先に「初期化」を実行してください。");
        const characters = (await this.fs.readJSON<CharacterInfo[]>(Config.CHARACTERS_FILE)) ?? [];
        const world =
            (await this.fs.readJSON<WorldInfo>(Config.WORLD_FILE)) ?? DEFAULT_WORLD_INFO;

        const outline = await this.gen.generateOutline(plot, characters, world, signal);
        this.log(`アウトラインを生成しました（${outline.length}章）。`, "success");
        return outline;
    }

    // --- command: write --------------------------------------------------------

    async getCurrentState(): Promise<NovelState> {
        const files = await this.fs.listDir(Config.SNAPSHOTS_DIR);
        const ids = files
            .map((f) => f.match(/^state_(\d+)\.json$/))
            .filter((m): m is RegExpMatchArray => m !== null)
            .map((m) => Number(m[1]))
            .sort((a, b) => b - a);
        if (ids.length === 0) {
            return { characters: {}, flags: {} };
        }
        return await this.fs.readJSON<NovelState>(`${Config.SNAPSHOTS_DIR}/state_${ids[0]}.json`) ?? { characters: {}, flags: {} };
    }

    async runWrite(count: number, signal?: AbortSignal): Promise<number> {
        this.log("執筆処理を開始します...", "info");
        const outline = await this.fs.readJSON<Outline>(Config.OUTLINE_FILE);
        if (!outline) throw new Error("アウトラインが見つかりません。先に「アウトライン生成」を実行してください。");

        const characters = (await this.fs.readJSON<CharacterInfo[]>(Config.CHARACTERS_FILE)) ?? [];
        const world =
            (await this.fs.readJSON<WorldInfo>(Config.WORLD_FILE)) ?? DEFAULT_WORLD_INFO;
        let currentState: NovelState = await this.getCurrentState();

        let scenesWritten = 0;
        let previousSummary = "";
        let previousSummaryFile = "";

        outer: for (const chapter of outline) {
            for (const scene of chapter.scenes ?? []) {
                if (scenesWritten >= count) {
                    this.log(`「執筆するシーン数」（${count}話分）の執筆が完了しました。`, "info");
                    break outer;
                }

                const sceneId = scene.scene_id;
                const sceneFile = `${Config.DRAFTS_DIR}/scene_${sceneId}.md`;
                const summaryFile = `${Config.DRAFTS_DIR}/scene_${sceneId}_summary.txt`;

                if (await this.fs.exists(sceneFile)) {
                    if (await this.fs.exists(summaryFile)) {
                        previousSummaryFile = summaryFile;
                    }
                    continue;
                }

                if (previousSummaryFile) {
                    previousSummary = await this.fs.readText(previousSummaryFile);
                }

                this.log(`第「${chapter.chapter_title}」章 シーン${sceneId} を執筆中...`, "info");
                const sceneText = await this.gen.writeScene(
                    scene,
                    previousSummary,
                    characters,
                    world,
                    currentState,
                    signal
                );

                this.log("シーンを要約中...", "info");
                const summary = await this.gen.summarizeScene(sceneText, signal);
                await this.fs.writeText(summaryFile, summary);

                this.log("タイトルを生成中...", "info");
                const title = await this.gen.generateTitle(`${chapter.chapter_title}\n${scene.summary}\n${summary}`, signal);
                const finalContent = `# ${title}\n\n${sceneText}`;
                await this.fs.writeText(sceneFile, finalContent);

                this.log(`シーン ${sceneId} の状態を更新中...`, "info");
                currentState = await this.gen.updateState(sceneText, currentState, characters, signal);
                await this.gen.saveStateSnapshot(currentState, sceneId);

                previousSummary = summary;
                scenesWritten += 1;
                this.log(`シーン ${sceneId}「${title}」を保存しました。`, "success");
            }
        }

        if (scenesWritten === 0) {
            this.log("アウトライン内の全シーンは既に執筆済みです。", "warn");
        }
        return scenesWritten;
    }

    // --- command: re-write --------------------------------------------------------
    async getLatestRev(sceneId: number): Promise<number> {
        const files = await this.fs.listDir(Config.DRAFTS_DIR);
        // 対象の sceneId に一致する revision 番号のみを正規表現で抽出
        const pattern = new RegExp(`^scene_${sceneId}_rev(\\d+)\\.md$`);

        let maxRev = 0;

        for (const file of files) {
            const match = file.match(pattern);
            if (match) {
                const revision = Number(match[1]);
                if (revision > maxRev) {
                    maxRev = revision;
                }
            }
        }

        return maxRev;
    }
    async runReWrite(sceneId: number, signal?: AbortSignal): Promise<number> {
        this.log("再執筆処理を開始します...", "info");
        const outline = await this.fs.readJSON<Outline>(Config.OUTLINE_FILE);
        if (!outline) throw new Error("アウトラインが見つかりません。先に「アウトライン生成」を実行してください。");

        const characters = (await this.fs.readJSON<CharacterInfo[]>(Config.CHARACTERS_FILE)) ?? [];
        const world =
            (await this.fs.readJSON<WorldInfo>(Config.WORLD_FILE)) ?? DEFAULT_WORLD_INFO;
        let currentState: NovelState = await this.gen.loadStateSnapshot(sceneId - 1) ?? { characters: {}, flags: {} };

        let scenesWritten = 0;

        let targetChapter: ChapterOutline | undefined;
        let targetScene: SceneOutline | undefined;

        for (const chapter of outline) {
            targetChapter = chapter;
            targetScene = (chapter.scenes ?? []).find((scene) => scene.scene_id == sceneId);
            if (targetScene) {
                break;
            }
        }
        if (!targetChapter || !targetScene) {
            return 0;
        }
        let previousSummary = "";
        const previousSummaryFile = `${Config.DRAFTS_DIR}/scene_${sceneId - 1}_summary.txt`;
        if (await this.fs.exists(previousSummaryFile)) {
            previousSummary = await this.fs.readText(previousSummaryFile);
        }
        this.log(`第「${targetChapter.chapter_title}」章 シーン${sceneId} を執筆中...`, "info");
        const sceneText = await this.gen.writeScene(
            targetScene,
            previousSummary,
            characters,
            world,
            currentState,
            signal
        );

        const sceneFile = `${Config.DRAFTS_DIR}/scene_${sceneId}.md`;
        const summaryFile = `${Config.DRAFTS_DIR}/scene_${sceneId}_summary.txt`;
        // rewrite時には、前のファイルは改訂として保存
        const rev = `_rev${await this.getLatestRev(sceneId) + 1}`;
        if (await this.fs.exists(sceneFile)) {
            const sceneRevFile = `${Config.DRAFTS_DIR}/scene_${sceneId}${rev}.md`;
            await this.fs.writeText(sceneRevFile, await this.fs.readText(sceneFile));
        }
        if (await this.fs.exists(summaryFile)) {
            const summaryRevFile = `${Config.DRAFTS_DIR}/scene_${sceneId}_summary${rev}.txt`;
            await this.fs.writeText(summaryRevFile, await this.fs.readText(summaryFile));
        }
        let orgState: NovelState | null = await this.gen.loadStateSnapshot(sceneId);
        if (orgState) {
            await this.gen.saveStateSnapshot(orgState, sceneId, rev);
        }
        //
        this.log("シーンを要約中...", "info");
        const summary = await this.gen.summarizeScene(sceneText, signal);
        await this.fs.writeText(summaryFile, summary);

        this.log("タイトルを生成中...", "info");
        const title = await this.gen.generateTitle(`${targetChapter.chapter_title}\n${targetScene.summary}\n${summary}`, signal);
        const finalContent = `# ${title}\n\n${sceneText}`;
        await this.fs.writeText(sceneFile, finalContent);

        this.log(`シーン ${sceneId} の状態を更新中...`, "info");
        currentState = await this.gen.updateState(sceneText, currentState, characters, signal);
        await this.gen.saveStateSnapshot(currentState, sceneId);

        previousSummary = summary;
        scenesWritten += 1;
        this.log(`シーン ${sceneId}「${title}」を保存しました。`, "success");

        return scenesWritten;
    }

    // --- command: reconstruct ---------------------------------------------------

    async runReconstruct(targetSceneId: number, signal?: AbortSignal): Promise<void> {
        const characters = (await this.fs.readJSON<CharacterInfo[]>(Config.CHARACTERS_FILE)) ?? [];

        const newState = await this.gen.reconstructState(targetSceneId, characters, signal);
        if (newState === null) {
            return;
        }
        await this.gen.saveStateSnapshot(newState, targetSceneId);
        this.log("状態の再構築が完了しました。", "success");

        const sceneFile = `${Config.DRAFTS_DIR}/scene_${targetSceneId}.md`;
        const summaryFile = `${Config.DRAFTS_DIR}/scene_${targetSceneId}_summary.txt`;
        if (await this.fs.exists(sceneFile)) {
            this.log(`シーン ${targetSceneId} の要約を再生成中...`, "info");
            const sceneText = await this.fs.readText(sceneFile);
            const summary = await this.gen.summarizeScene(sceneText, signal);
            await this.fs.writeText(summaryFile, summary);
            this.log("要約の再生成が完了しました。", "success");
        } else {
            this.log(`シーン ${targetSceneId} のファイルが見つからないため、要約再生成をスキップします。`, "warn");
        }
    }
}
