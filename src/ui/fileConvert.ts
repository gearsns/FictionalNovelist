import { Config } from "../core/config";
import type { ConvertTypeOption, LogFn } from "../core/types";
import type { FsManager } from "../services/fsManager";
import { convertMarkdownToKakuyomu, convertMarkdownToNarou } from "../utils/webNovel";
import { sceneFilePath } from "./scene";

export async function convertFiles(fs: FsManager, log: LogFn, type: ConvertTypeOption) {
    console.log(type)
    const files = await fs.listDir(Config.DRAFTS_DIR);
    const ids = files
        .map((f) => f.match(/^scene_(\d+)\.md$/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => Number(m[1]))
        .sort((a, b) => a - b);
    if (ids.length === 0){
        return false;
    }
    for (const id of ids) {
        const filename = sceneFilePath(id);
        const text = await fs.readText(filename);
        log(`シーン ${id} を変換中。`);
        switch (type) {
            case "kakuyomu":
                fs.writeText(`${Config.CONVERT_DIR}/kakuyumu/${id}.txt`, convertMarkdownToKakuyomu(text));
                break;
            case "narou":
            default:
                fs.writeText(`${Config.CONVERT_DIR}/narou/${id}.txt`, convertMarkdownToNarou(text));
                break;
        }
    }
    return true;
}
