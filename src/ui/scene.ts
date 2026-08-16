import { Config } from "../core/config";
import type { FsManager } from "../services/fsManager";

export function sceneFilePath(sceneId: number | string): string {
    return `${Config.DRAFTS_DIR}/scene_${sceneId}.md`;
}

export function sceneStateFilePath(sceneId: number | string): string {
    return `${Config.SNAPSHOTS_DIR}/state_${sceneId}.json`;
}

export function sceneSummaryFilePath(sceneIdAndRev: number | string): string {
    const [sceneId, rev] = String(sceneIdAndRev).split(/_rev/);
    return rev
        ? `${Config.DRAFTS_DIR}/scene_${sceneId}_summary_rev${rev}.txt`
        : `${Config.DRAFTS_DIR}/scene_${sceneId}_summary.txt`;
}

export async function populateSceneList(fs: FsManager, editSceneSelect: HTMLSelectElement): Promise<number[]> {
    const files = await fs.listDir(Config.DRAFTS_DIR);
    const ids = files
        .map((f) => f.match(/^scene_(\d+)\.md$/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => Number(m[1]))
        .sort((a, b) => a - b);
    editSceneSelect.innerHTML = ids.map((id) => `<option value="${id}">シーン ${id}</option>`).join("");
    return ids;
}

export function sceneName(id: string) {
    const [sceneId, rev] = String(id).split(/_rev/);
    return rev
        ? `シーン ${sceneId} (旧版 ${rev})`
        : `シーン ${sceneId}`
        ;
}
async function populateMatchWithRevList(fs: FsManager, dir: string, cond: RegExp, editSelect: HTMLSelectElement): Promise<string[]> {
    const files = await fs.listDir(dir);

    const parsedFiles = files
        .map((f) => {
            // scene_1.md や scene_1_rev2.md にマッチ
            const match = f.match(cond);
            if (!match) return null;
            return {
                filename: f,
                sceneId: Number(match[1]),
                revId: match[2] ? Number(match[2]) : null,
                // value用のキー（例: "1" または "1_rev2"）
                key: match[2] ? `${match[1]}_rev${match[2]}` : `${match[1]}`,
            };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

    // シーンID順 -> 改訂なし優先 -> 改訂ID順 でソート
    parsedFiles.sort((a, b) => {
        if (a.sceneId !== b.sceneId) return a.sceneId - b.sceneId;
        if (a.revId === null) return -1;
        if (b.revId === null) return 1;
        return a.revId - b.revId;
    });

    // option要素の生成
    editSelect.innerHTML = parsedFiles
        .map((item) => {
            const label = item.revId === null
                ? `シーン ${item.sceneId}`
                : `シーン ${item.sceneId} (旧版 ${item.revId})`;
            return `<option value="${item.key}">${label}</option>`;
        })
        .join("");

    return parsedFiles.map((item) => item.key);
}

export async function populateSceneWithRevList(fs: FsManager, editSceneSelect: HTMLSelectElement): Promise<string[]> {
    return await populateMatchWithRevList(fs, Config.DRAFTS_DIR, /^scene_(\d+)(?:_rev(\d+))?\.md$/, editSceneSelect);
}

export async function populateSceneStateList(fs: FsManager, editSceneSelect: HTMLSelectElement): Promise<string[]> {
    return await populateMatchWithRevList(fs, Config.SNAPSHOTS_DIR, /^state_(\d+)(?:_rev(\d+))?\.json$/, editSceneSelect);
}

export async function populateSceneSummaryList(fs: FsManager, editSceneSelect: HTMLSelectElement): Promise<string[]> {
    return await populateMatchWithRevList(fs, Config.DRAFTS_DIR, /^scene_(\d+)_summary(?:_rev(\d+))?\.txt$/, editSceneSelect);
}

