import "./style.css";
import "./components/jsonEditor";
import "./components/markdownEditor";
import "./components/opfsWorkspace";

import { FsManager } from "./services/fsManager";
import { Generator } from "./core/generator";
import { Controller } from "./core/controller";
import { state } from "./state/appState";
import { renderAppLayout } from "./ui/layout";
import { initStreamPreview } from "./ui/streamPreview";
import {
    loadEditorFile,
    getEditorSaveValue,
    currentEditKey,
    type EditFileKey,
} from "./ui/editorHandler";
import type { Outline } from "./core/types";
import { getEl, getAllEl } from "./utils/dom";
import { createLogger } from "./ui/logger";
import { initSettingsUI } from "./ui/settingsUI";
import { initFileStatusUI } from "./ui/fileStatusUI";
import { SwitchableLLMClient } from "./services/llmClient";
import { convertFiles } from "./ui/fileConvert";
import { parseConvertTypeOption } from "./ui/layout/panels/convertPanel";

// 1. Layout & Root UI
const app = getEl<HTMLDivElement>("#app");
renderAppLayout(app);

// 2. Logger & UI Elements
const { appendLog, clearLog } = createLogger(getEl<HTMLDivElement>("#console"));
getEl("#clear-log-btn").addEventListener("click", clearLog);

// 3. Core Services
const fs = new FsManager();
const { updateStreamPreview, resetStreamPreview } = initStreamPreview();
const client = new SwitchableLLMClient(state.settings.provider, state.settings.host, state.settings.apiKey, state.settings.model, appendLog, state.settings);
const generator = new Generator(fs, client, state.settings, appendLog, updateStreamPreview);
const controller = new Controller(fs, generator, appendLog);

// 4. Sub-modules Initialization
const { loadSettingsFromFolder, persistSettingsIfReady } = initSettingsUI(fs, client, appendLog);
const { refreshAllFileLists } = initFileStatusUI(fs);

// 5. Navigation & Panels
const steps = getAllEl<HTMLElement>(".step");
const panels = getAllEl<HTMLElement>(".panel");

const editSelect = getEl<HTMLSelectElement>("#edit-file-select");
const editMount = getEl<HTMLDivElement>("#edit-mount");
const editHint = getEl<HTMLDivElement>("#edit-hint");
const editSceneField = getEl<HTMLLabelElement>("#edit-scene-field");
const editSceneSelect = getEl<HTMLSelectElement>("#edit-scene-select");
const editSceneStateField = getEl<HTMLLabelElement>("#edit-scene-state-field");
const editSceneStateSelect = getEl<HTMLSelectElement>("#edit-scene-state-select");
const editSceneSummaryField = getEl<HTMLLabelElement>("#edit-scene-summary-field");
const editSceneSummarySelect = getEl<HTMLSelectElement>("#edit-scene-summary-select");

async function loadCurrentEditorFile(key: EditFileKey, sceneId?: string) {
    await loadEditorFile(fs, key, editMount,
        editSceneField, editSceneSelect,
        editSceneStateField, editSceneStateSelect,
        editSceneSummaryField, editSceneSummarySelect,
        editHint, requireFolder, sceneId);
}

async function refreshAll() {
    await refreshAllFileLists();
    await loadCurrentEditorFile(currentEditKey);
}

steps.forEach((stepEl) => {
    stepEl.addEventListener("click", () => {
        const target = stepEl.dataset.step!;
        steps.forEach((s) => s.classList.toggle("active", s === stepEl));
        panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === target));

        if (target === "edit" && fs.isReady && !state.editorLoaded) {
            withBusy(async () => {
                loadCurrentEditorFile(currentEditKey);
            });
        }
    });
});

// 6. Folder Selection
getEl("#pick-folder-btn").addEventListener("click", async () => {
    try {
        await fs.pickRootDirectory();
        getEl<HTMLDivElement>("#folder-status").classList.add("connected");
        getEl<HTMLSpanElement>("#folder-status-text").textContent = fs.rootName;
        appendLog(`プロジェクトフォルダ「${fs.rootName}」を選択しました。`, "success");
        state.editorLoaded = false;
        await loadSettingsFromFolder();
        await refreshAll();
    } catch (e) {
        appendLog(String((e as Error).message ?? e), "error");
    }
});

getEl("#open-workspace-btn").addEventListener("click", async () => {
    try {
        const container = getEl('#workspace-container');
        const workspace = container.querySelector('opfs-workspace');
        if (workspace) {
            workspace.initProject = fs.rootName;
            return;
        }
        // ボタンクリック時に動的作成して DOM に追加
        const newWorkspace = document.createElement('opfs-workspace');
        newWorkspace.initProject = fs.rootName;
        newWorkspace.addEventListener("project-opened", async (e) => {
            newWorkspace.close();
            const customEvent = e as CustomEvent<{ projectName: string; path: string }>;
            getEl<HTMLSpanElement>("#folder-status-text").textContent = customEvent.detail.projectName;
            appendLog(`ワークスペース「${customEvent.detail.projectName}」を選択しました。`, "success");
            await fs.initOpfs(customEvent.detail.path);
            state.editorLoaded = false;
            await loadSettingsFromFolder();
            await refreshAll();
        });
        container.appendChild(newWorkspace);
    } catch (e) {
        appendLog(String((e as Error).message ?? e), "error");
    }
});

// 7. Test Connection & Save Settings Buttons
getEl("#test-connection-btn").addEventListener("click", async () => {
    appendLog("API への接続を確認中...", "info");
    const result = await client.checkConnection();
    appendLog(result.message, result.ok ? "success" : "error");
});

getEl("#save-settings-btn").addEventListener("click", async () => {
    if (!fs.isReady) {
        appendLog("先にプロジェクトフォルダを選択してください。", "error");
        return;
    }
    await persistSettingsIfReady();
    appendLog(`設定を保存しました。`, "success");
});

// 8. Idea File Handler
getEl("#idea-file").addEventListener("change", async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    state.ideaFileText = await file.text();
    getEl<HTMLTextAreaElement>("#idea-text").value = state.ideaFileText;
    appendLog(`アイデアファイル「${file.name}」を読み込みました。`, "success");
});

// 9. Busy State Wrapper
const actionButtons = getAllEl<HTMLButtonElement>(
    "#run-init-btn, #rerun-init-btn, #run-outline-btn, #run-write-btn, #run-rewrite-btn, #run-reconstruct-btn, #test-connection-btn, #pick-folder-btn, #save-settings-btn, #edit-save-btn, #edit-reload-btn"
);

async function withBusy(fn: () => Promise<void>) {
    if (state.busy) return;
    state.busy = true;
    state.abortController = new AbortController();
    streamStopEl.classList.add("active");
    actionButtons.forEach((b) => (b.disabled = true));
    resetStreamPreview("生成準備中...");
    try {
        await fn();
    } catch (e) {
        appendLog(String((e as Error).message ?? e), "error");
    } finally {
        state.busy = false;
        actionButtons.forEach((b) => (b.disabled = false));
        resetStreamPreview("待機中");
        streamStopEl.classList.remove("active");
    }
}

function requireFolder() {
    if (!fs.isReady) {
        throw new Error("先に「フォルダを選択」してプロジェクトフォルダを指定してください。");
    }
}

const streamStopEl = document.querySelector<HTMLSpanElement>("#stream-stop")!;
streamStopEl.addEventListener("click", () => {
    state.abortController?.abort();
});


// 10. Generation Command Bindings
getEl("#run-init-btn").addEventListener("click", () =>
    withBusy(async () => {
        requireFolder();
        const typed = getEl<HTMLTextAreaElement>("#idea-text").value.trim();
        const idea = state.ideaFileText.trim() || typed || undefined;
        await controller.runInit(idea, true, state.abortController?.signal);
        await refreshAll();
    })
);

getEl("#rerun-init-btn").addEventListener("click", () =>
    withBusy(async () => {
        requireFolder();
        const typed = getEl<HTMLTextAreaElement>("#idea-text").value.trim();
        const idea = state.ideaFileText.trim() || typed || undefined;
        await controller.runInit(idea, false, state.abortController?.signal);
        await refreshAll();
    })
);


getEl("#run-outline-btn").addEventListener("click", () =>
    withBusy(async () => {
        requireFolder();
        state.lastOutline = await controller.runOutline(state.abortController?.signal);
        renderOutlineResult(state.lastOutline);
        await refreshAll();
    })
);

getEl("#run-write-btn").addEventListener("click", () =>
    withBusy(async () => {
        requireFolder();
        const count = Number(getEl<HTMLInputElement>("#write-count").value) || 1;
        const written = await controller.runWrite(count, state.abortController?.signal);
        getEl<HTMLDivElement>("#write-result").innerHTML =
            written > 0
                ? `<div class="hint">${written} 件のシーンを書き出しました。「drafts」フォルダを確認してください。</div>`
                : "";
        await refreshAll();
    })
);

getEl("#run-rewrite-btn").addEventListener("click", () =>
    withBusy(async () => {
        requireFolder();
        const sceneId = Number(getEl<HTMLSelectElement>("#rewrite-scene-select").value) || 1;
        const written = await controller.runReWrite(sceneId, state.abortController?.signal);
        getEl<HTMLDivElement>("#write-result").innerHTML =
            written > 0
                ? `<div class="hint">シーン${sceneId}を再執筆しました。「drafts」フォルダを確認してください。</div>`
                : "";
        await refreshAll();
    })
);

getEl("#run-reconstruct-btn").addEventListener("click", () =>
    withBusy(async () => {
        requireFolder();
        const sceneId = Number(getEl<HTMLInputElement>("#reconstruct-scene-select").value) || 1;
        await controller.runReconstruct(sceneId, state.abortController?.signal);
        await refreshAll();
    })
);

function renderOutlineResult(outline: Outline) {
    const el = getEl<HTMLDivElement>("#outline-result");
    if (!outline.length) {
        el.innerHTML = `<div class="empty-note">アウトラインがまだありません。</div>`;
        return;
    }
    const chapters = outline
        .map(
            (ch) =>
                `<div style="margin-bottom:0.75rem;"><strong>${ch.chapter_title}</strong><div class="hint">シーン数: ${ch.scenes?.length ?? 0
                }</div></div>`
        )
        .join("");
    el.innerHTML = `<div class="card">${chapters}</div>`;
}

// 11. Edit Panel Event Handlers
editMount.addEventListener("markdown-editor-mode-change", (e) => {
    state.markdownViewMode = (e as CustomEvent<{ mode: "split" | "editor" | "preview" }>).detail.mode;
});

editSelect.addEventListener("change", () => {
    withBusy(() =>
        loadCurrentEditorFile(editSelect.value as EditFileKey)
    );
});

editSceneSelect.addEventListener("change", () => {
    withBusy(() =>
        loadCurrentEditorFile("scene", editSceneSelect.value)
    );
});

editSceneStateSelect.addEventListener("change", () => {
    withBusy(() =>
        loadCurrentEditorFile("sceneState", editSceneStateSelect.value)
    );
});

editSceneSummarySelect.addEventListener("change", () => {
    withBusy(() =>
        loadCurrentEditorFile("summary", editSceneSummarySelect.value)
    );
});

getEl("#edit-reload-btn").addEventListener("click", () =>
    withBusy(async () => {
        loadCurrentEditorFile(currentEditKey);
    })
);

getEl("#edit-save-btn").addEventListener("click", () =>
    withBusy(async () => {
        requireFolder();
        const { path, text } = getEditorSaveValue(editMount, editSceneSelect, editSceneStateSelect, editSceneSummarySelect);
        await fs.writeText(path, text);
        appendLog(`${path} を保存しました。`, "success");
        await refreshAllFileLists();
    })
);

// 12. Convert
getEl("#run-convert-btn").addEventListener("click", () => {
    withBusy(async () => {
        requireFolder();
        const site = parseConvertTypeOption(getEl<HTMLInputElement>("#novel-site").value) || "narou";
        const ret = await convertFiles(fs, appendLog, site);
        if (ret) {
            appendLog(`変換が完了しました。`, "success");
        } else {
            appendLog(`変換処理でエラーが発生しました。`, "warn");
        }
    })
});

// 13. Startup Check
if (!("showDirectoryPicker" in window)) {
    getEl("#pick-folder-btn").style.display = "none";
    getEl("#open-workspace-btn").classList.add("btn-primary");
} else {
    appendLog("準備ができました。まずはプロジェクトフォルダを選択してください。", "info");
}
