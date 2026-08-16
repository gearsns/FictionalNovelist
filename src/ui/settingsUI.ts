import { Config, DEFAULT_SETTINGS } from "../core/config";
import type { AppSettings } from "../core/types";
import type { FsManager } from "../services/fsManager";
import type { SwitchableLLMClient } from "../services/llmClient";
import { state } from "../state/appState";
import { getEl } from "../utils/dom";
import { parseProviderOption, parseThinkOption } from "./layout/panels/prepPanel";

export function initSettingsUI(
    fs: FsManager,
    client: SwitchableLLMClient,
    appendLog: (msg: string, level?: any) => void
) {
    function bindText(id: string, onChange: (value: string) => void) {
        getEl(`#${id}`).addEventListener("change", (e) => {
            const target = e.target as HTMLInputElement | HTMLTextAreaElement;
            onChange(target.value);
            persistSettingsIfReady();
        });
    }

    function refreshSettingsForm() {
        const setVal = (id: string, value: string | number) => {
            const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`);
            if (el) el.value = String(value);
        };

        setVal("settings-provider", state.settings.provider);
        setVal("settings-host", state.settings.host);
        setVal("settings-model", state.settings.model);
        setVal("settings-apikey", state.settings.apiKey);
        setVal("settings-viewpoint", state.settings.viewpoint);
        setVal("settings-style", state.settings.style);
        setVal("settings-min", state.settings.minChars);
        setVal("settings-max", state.settings.maxChars);
        setVal("settings-temperature", state.settings.temperature);
        setVal("settings-top-p", state.settings.topP);
        setVal("settings-repeat-penalty", state.settings.repeatPenalty);
        setVal("settings-num-ctx", state.settings.numCtx);
        setVal("settings-num-predict", state.settings.numPredict);

        client.setProvider(state.settings.provider);
        client.setHost(state.settings.host);
        client.setAPIKey(state.settings.apiKey);
        client.setModel(state.settings.model);
        client.setThink(state.settings.think);
    }

    async function persistSettingsIfReady() {
        if (!fs.isReady) return;
        try {
            await fs.writeJSON(Config.SETTINGS_FILE, state.settings);
        } catch (e) {
            appendLog(`設定の保存に失敗しました: ${String((e as Error).message ?? e)}`, "error");
        }
    }

    async function loadSettingsFromFolder() {
        try {
            const loaded = await fs.readJSON<Partial<AppSettings>>(Config.SETTINGS_FILE);
            if (loaded) {
                Object.assign(state.settings, loaded);
                refreshSettingsForm();
                appendLog(`保存済みの設定（${Config.SETTINGS_FILE}）を読み込みました。`, "success");
            } else {
                await persistSettingsIfReady();
                appendLog(`設定ファイルが無かったため、現在の設定を ${Config.SETTINGS_FILE} として作成しました。`, "info");
            }
        } catch (e) {
            appendLog(`設定の読み込みに失敗しました: ${String((e as Error).message ?? e)}`, "error");
        }
    }

    // Bindings
    bindText("settings-provider", (v) => { const provider = parseProviderOption(v); state.settings.provider = provider; client.setProvider(provider); });
    bindText("settings-host", (v) => { const host = v.trim(); state.settings.host = host; client.setHost(host); });
    bindText("settings-apikey", (v) => { const apiKey = v.trim(); state.settings.apiKey = apiKey; client.setAPIKey(apiKey); });
    bindText("settings-model", (v) => { const model = v.trim(); state.settings.model = model; client.setModel(model); });
    bindText("settings-think", (v) => { const think = parseThinkOption(v); state.settings.think = think; client.setThink(think); });
    bindText("settings-viewpoint", (v) => (state.settings.viewpoint = v));
    bindText("settings-style", (v) => (state.settings.style = v));
    bindText("settings-min", (v) => (state.settings.minChars = Number(v) || DEFAULT_SETTINGS.minChars));
    bindText("settings-max", (v) => (state.settings.maxChars = Number(v) || DEFAULT_SETTINGS.maxChars));
    bindText("settings-temperature", (v) => {
        const n = Number(v);
        state.settings.temperature = Number.isFinite(n) ? n : DEFAULT_SETTINGS.temperature;
    });
    bindText("settings-top-p", (v) => {
        const n = Number(v);
        state.settings.topP = Number.isFinite(n) ? n : DEFAULT_SETTINGS.topP;
    });
    bindText("settings-repeat-penalty", (v) => {
        const n = Number(v);
        state.settings.repeatPenalty = Number.isFinite(n) ? n : DEFAULT_SETTINGS.repeatPenalty;
    });
    bindText("settings-num-ctx", (v) => (state.settings.numCtx = Number(v) || DEFAULT_SETTINGS.numCtx));
    bindText("settings-num-predict", (v) => {
        const n = Number(v);
        state.settings.numPredict = Number.isFinite(n) ? n : DEFAULT_SETTINGS.numPredict;
    });

    return { loadSettingsFromFolder, persistSettingsIfReady };
}
