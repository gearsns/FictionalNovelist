import { Config } from "../core/config";
import type { Outline } from "../core/types";
import type { FsManager } from "../services/fsManager";
import { getEl } from "../utils/dom";
import { populateSceneList } from "./scene";

export function initFileStatusUI(fs: FsManager) {
    async function fileRow(container: HTMLElement, label: string, path: string) {
        const exists = fs.isReady ? await fs.exists(path) : false;
        const row = document.createElement("div");
        row.className = "row-item";
        row.innerHTML = `<span>${label} (${path})</span><span class="${exists ? "yes" : "no"}">${exists ? "✓ 完了" : "— 未生成"
            }</span>`;
        container.appendChild(row);
    }

    async function updateStepChecks() {
        const setCheck = async (id: string, path: string) => {
            const el = getEl<HTMLSpanElement>(`[data-check="${id}"]`);
            el.textContent = fs.isReady && (await fs.exists(path)) ? "✓" : "";
        };
        await setCheck("init", Config.PLOT_FILE);
        await setCheck("outline", Config.OUTLINE_FILE);
    }

    async function refreshAllFileLists() {
        const initList = getEl<HTMLDivElement>("#file-list-init");
        initList.innerHTML = "";
        await fileRow(initList, "プロット", Config.PLOT_FILE);
        await fileRow(initList, "登場人物", Config.CHARACTERS_FILE);
        await fileRow(initList, "世界観", Config.WORLD_FILE);
        if (fs.isReady && await fs.exists(Config.IDEA_FILE)) {
            getEl<HTMLTextAreaElement>("#idea-text").value = await fs.readText(Config.IDEA_FILE);
        } else {
            getEl<HTMLTextAreaElement>("#idea-text").value = "";
        }
        getEl<HTMLTextAreaElement>("#outline-result").value = "";

        const outlineList = getEl<HTMLDivElement>("#file-list-outline");
        outlineList.innerHTML = "";
        await fileRow(outlineList, "アウトライン", Config.OUTLINE_FILE);

        const writeList = getEl<HTMLDivElement>("#file-list-write");
        writeList.innerHTML = "";
        await fileRow(writeList, "アウトライン", Config.OUTLINE_FILE);

        if (fs.isReady) {
            let scenes = 0;
            try {
                const outlines = await fs.readJSON<Outline>(Config.OUTLINE_FILE);
                for (const outline of outlines ?? []) {
                    scenes += outline.scenes.length;
                }
            } catch {

            }
            const drafts = await fs.listDir(Config.DRAFTS_DIR);
            const sceneCount = drafts.filter((f) => /^scene_\d+\.md$/.test(f)).length;
            const row = document.createElement("div");
            row.className = "row-item";
            row.innerHTML = `<span>執筆済みシーン数</span><span>${sceneCount} / ${scenes}</span>`;
            writeList.appendChild(row);

            getEl<HTMLButtonElement>("#run-write-btn").textContent = sceneCount > 0
                ? `シーン ${sceneCount + 1} から執筆`
                : "最初から執筆";
        }
        const rewriteSceneSelect = getEl<HTMLSelectElement>("#rewrite-scene-select");
        const ids = await populateSceneList(fs, rewriteSceneSelect);
        rewriteSceneSelect.value = `${ids.length}`;
        const reconstructSceneSelect = getEl<HTMLSelectElement>("#reconstruct-scene-select");
        await populateSceneList(fs, reconstructSceneSelect);
        reconstructSceneSelect.value = `${ids.length}`;

        await updateStepChecks();
    }
    return { refreshAllFileLists };
}
