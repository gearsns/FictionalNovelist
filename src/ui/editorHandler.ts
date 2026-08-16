import { Config } from "../core/config";
import { CHARACTERS_SCHEMA, WORLD_SCHEMA, OUTLINE_SCHEMA, STATE_SCHEMA } from "../core/jsonSchemas";
import { renumberSceneIds } from "../core/generator";
import type { FsManager } from "../services/fsManager";
import type { JsonEditorElement } from "../components/jsonEditor";
import type { MarkdownEditorElement } from "../components/markdownEditor";
import type { Outline } from "../core/types";
import { state } from "../state/appState";
import { populateSceneStateList, populateSceneSummaryList, populateSceneWithRevList, sceneFilePath, sceneName, sceneStateFilePath, sceneSummaryFilePath } from "./scene";

export type EditFileKey = "characters" | "world" | "outline" | "plot" | "scene" | "sceneState" | "summary";

export const EDIT_FILE_PATHS: Partial<Record<EditFileKey, string>> = {
    characters: Config.CHARACTERS_FILE,
    world: Config.WORLD_FILE,
    outline: Config.OUTLINE_FILE,
    plot: Config.PLOT_FILE,
};

export const EDIT_SCHEMAS: Partial<Record<EditFileKey, unknown>> = {
    characters: CHARACTERS_SCHEMA,
    world: WORLD_SCHEMA,
    outline: OUTLINE_SCHEMA,
    sceneState: STATE_SCHEMA,
};

export const EDIT_LABELS: Record<EditFileKey, string> = {
    characters: "登場人物",
    world: "世界観",
    outline: "アウトライン",
    plot: "プロット",
    scene: "シーン本文",
    summary: "シーン要約",
    sceneState: "シーンごとの状態",
};

export let currentEditKey: EditFileKey = "plot";

export async function loadEditorFile(
    fs: FsManager,
    key: EditFileKey,
    editMount: HTMLDivElement,
    editSceneField: HTMLLabelElement,
    editSceneSelect: HTMLSelectElement,
    editSceneStateField: HTMLLabelElement,
    editSceneStateSelect: HTMLSelectElement,
    editSceneSummaryField: HTMLLabelElement,
    editSceneSummarySelect: HTMLSelectElement,
    editHint: HTMLDivElement,
    requireFolder: () => void,
    sceneId?: string
) {
    requireFolder();
    currentEditKey = key;
    editMount.innerHTML = "";
    editSceneField.classList.toggle("selected", key === "scene");
    editSceneStateField.classList.toggle("selected", key === "sceneState");
    editSceneSummaryField.classList.toggle("selected", key === "summary");
    const schema = EDIT_SCHEMAS[key];

    if (key === "scene") {
        const ids = await populateSceneWithRevList(fs, editSceneSelect);
        if (ids.length === 0) {
            editHint.textContent = "まだ執筆されたシーンがありません。「執筆」タブでシーンを生成してください。";
            state.editorLoaded = true;
            return;
        }
        const targetId = sceneId !== undefined && ids.includes(sceneId) ? sceneId : ids[0];
        editSceneSelect.value = String(targetId);
        const path = sceneFilePath(targetId);
        const text = await fs.readText(path);
        const el = document.createElement("markdown-editor");
        el.label = sceneName(targetId);
        el.value = text;
        el.mode = state.markdownViewMode;
        editMount.appendChild(el);
        editHint.textContent = `${path} を編集しています。`;
    } else if (key === "sceneState") {
        const ids = await populateSceneStateList(fs, editSceneStateSelect);
        if (ids.length === 0) {
            editHint.textContent = "まだ執筆されたシーンがありません。「執筆」タブでシーンを生成してください。";
            state.editorLoaded = true;
            return;
        }
        const targetId = sceneId !== undefined && ids.includes(sceneId) ? sceneId : ids[0];
        editSceneStateSelect.value = String(targetId);
        const path = sceneStateFilePath(targetId);
        const data = (await fs.readJSON(path)) ?? (Array.isArray(schema) ? [] : {});
        const el = document.createElement("json-editor");
        el.label = sceneName(targetId);
        el.schema = schema;
        el.value = data;
        editMount.appendChild(el);
        editHint.textContent = `${path} を編集しています。「新しいキー名」にキャラクター名やフラグ名を入力して項目を追加できます。`;
    } else if (key === "summary") {
        const ids = await populateSceneSummaryList(fs, editSceneSummarySelect);
        if (ids.length === 0) {
            editHint.textContent = "まだ執筆されたシーンがありません。「執筆」タブでシーンを生成してください。";
            state.editorLoaded = true;
            return;
        }
        const targetId = sceneId !== undefined && ids.includes(sceneId) ? sceneId : ids[0];
        editSceneSummarySelect.value = String(targetId);
        const path = sceneSummaryFilePath(targetId);
        const text = await fs.readText(path);
        const textarea = document.createElement("textarea");
        textarea.className = "edit-raw-textarea";
        textarea.id = "edit-raw-textarea";
        textarea.value = text;
        editMount.appendChild(textarea);
        editHint.textContent = `${sceneName(targetId)} を編集しています。`;
    } else if (key === "plot") {
        const path = Config.PLOT_FILE;
        const text = (await fs.exists(path)) ? await fs.readText(path) : "";
        const el = document.createElement("markdown-editor");
        el.label = EDIT_LABELS.plot;
        el.value = text;
        el.mode = state.markdownViewMode;
        editMount.appendChild(el);
        editHint.textContent = `${path} を編集しています。`;
    } else if (schema) {
        const path = EDIT_FILE_PATHS[key]!;
        const data = (await fs.readJSON(path)) ?? (Array.isArray(schema) ? [] : {});
        const el = document.createElement("json-editor");
        el.label = EDIT_LABELS[key];
        el.schema = schema;
        el.value = data;
        editMount.appendChild(el);
        editHint.textContent =
            key === "outline"
                ? `${path} を編集しています。カードの ⋮⋮ をドラッグして並べ替え可能。保存時にシーンIDは表示順で自動的に振り直されます。`
                : `${path} を編集しています。カードの ⋮⋮ をドラッグして並べ替え、「保存」でフォルダに書き込みます。`;
    } else {
        const path = EDIT_FILE_PATHS[key]!;
        const textarea = document.createElement("textarea");
        textarea.className = "edit-raw-textarea";
        textarea.id = "edit-raw-textarea";
        textarea.value = (await fs.exists(path)) ? await fs.readText(path) : "{}";
        editMount.appendChild(textarea);
        editHint.textContent = `${path} を生のJSONとして編集しています。有効なJSONでないと保存できません。`;
    }
    state.editorLoaded = true;
}

export function getEditorSaveValue(
    editMount: HTMLDivElement,
    editSceneSelect: HTMLSelectElement,
    editSceneStateSelect: HTMLSelectElement,
    editSceneSummarySelect: HTMLSelectElement
): { path: string; text: string } {
    if (currentEditKey === "scene") {
        const sceneId = Number(editSceneSelect.value);
        const el = editMount.querySelector<MarkdownEditorElement>("markdown-editor");
        if (!el || !Number.isFinite(sceneId)) throw new Error("エディタが読み込まれていません。");
        return { path: sceneFilePath(sceneId), text: el.getValue() };
    }
    if (currentEditKey === "sceneState") {
        const sceneId = Number(editSceneStateSelect.value);
        const el = editMount.querySelector<JsonEditorElement>("json-editor");
        if (!el || !Number.isFinite(sceneId)) throw new Error("エディタが読み込まれていません。");
        return { path: sceneStateFilePath(sceneId), text: JSON.stringify(el.getValue(), null, 2) };
    }
    if (currentEditKey === "summary") {
        const sceneId = Number(editSceneSummarySelect.value);
        const el = editMount.querySelector<HTMLTextAreaElement>("#edit-raw-textarea");
        if (!el || !Number.isFinite(sceneId)) throw new Error("エディタが読み込まれていません。");
        return { path: sceneSummaryFilePath(sceneId), text: el.value };
    }
    if (currentEditKey === "plot") {
        const el = editMount.querySelector<MarkdownEditorElement>("markdown-editor");
        if (!el) throw new Error("エディタが読み込まれていません。");
        return { path: Config.PLOT_FILE, text: el.getValue() };
    }
    const path = EDIT_FILE_PATHS[currentEditKey]!;
    if (currentEditKey === "outline") {
        const el = editMount.querySelector<JsonEditorElement>("json-editor");
        if (!el) throw new Error("エディタが読み込まれていません。");
        const outline = renumberSceneIds(el.getValue() as Outline);
        return { path, text: JSON.stringify(outline, null, 2) };
    }
    if (EDIT_SCHEMAS[currentEditKey]) {
        const el = editMount.querySelector<JsonEditorElement>("json-editor");
        if (!el) throw new Error("エディタが読み込まれていません。");
        return { path, text: JSON.stringify(el.getValue(), null, 2) };
    }
    const textarea = editMount.querySelector<HTMLTextAreaElement>("#edit-raw-textarea");
    if (!textarea) throw new Error("エディタが読み込まれていません。");
    JSON.parse(textarea.value);
    return { path, text: textarea.value };
}
