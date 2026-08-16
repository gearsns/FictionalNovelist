// Thin wrapper around the File System Access API that mirrors the
// responsibilities of the original Python `state_manager.py` /
// `os.path` based file handling, but backed by a picked local folder.
import JSZip from "jszip";
export class FsManager {
    private root: FileSystemDirectoryHandle | null = null;

    get isReady(): boolean {
        return this.root !== null;
    }

    get rootName(): string {
        return this.root?.name ?? "";
    }

    /**
       * OPFS を初期化。引数にパスを渡すことで、OPFS内の特定のサブフォルダを作業ルートにできます。
       * @param subDir - 例: "project-a" や "workspaces/project-1"
       */
    async initOpfs(subDir?: string): Promise<void> {
        if (!("storage" in navigator && "getDirectory" in navigator.storage)) {
            throw new Error("この環境は OPFS (Origin Private File System) に対応していません。");
        }

        let dir = await navigator.storage.getDirectory();

        // サブフォルダが指定されている場合は、階層を辿って（無ければ作成して）ルートにする
        if (subDir) {
            const parts = subDir.split("/").filter(Boolean);
            for (const part of parts) {
                dir = await dir.getDirectoryHandle(part, { create: true });
            }
        }

        this.root = dir;
    }
    /** 指定ディレクトリ配下の「フォルダ（ディレクトリ）名一覧」を取得 */
    async listSubdirectories(relativeDir: string = ""): Promise<string[]> {
        const root = this.requireRoot();
        let dir = root;
        const parts = relativeDir.split("/").filter(Boolean);
        try {
            for (const part of parts) {
                dir = await dir.getDirectoryHandle(part, { create: false });
            }
        } catch {
            return [];
        }
        const names: string[] = [];
        for await (const [name, handle] of dir.entries()) {
            // file ではなく directory のみを抽出
            if (handle.kind === "directory") names.push(name);
        }
        return names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }

    /** 新規フォルダの作成 */
    async createDirectory(relativeDir: string): Promise<void> {
        const root = this.requireRoot();
        const parts = relativeDir.split("/").filter(Boolean);
        let dir = root;
        for (const part of parts) {
            dir = await dir.getDirectoryHandle(part, { create: true });
        }
    }
    /** ファイル/フォルダの削除（再帰的削除） */
    async deleteEntry(relativePath: string): Promise<void> {
        const { dir, fileName } = await this.resolveParent(relativePath, false);
        // recursive: true で中身があるフォルダも一括削除可能
        await dir.removeEntry(fileName, { recursive: true });
    }

    /** 現在のルートフォルダ内を全件再帰して ZIP ダウンロード */
    async exportZip(projectName: string, zipFileName: string = "workspace.zip"): Promise<void> {
        const root = this.requireRoot();

        // エクスポート対象のプロジェクトフォルダを取得
        let targetDir: FileSystemDirectoryHandle;
        try {
            targetDir = await root.getDirectoryHandle(projectName);
        } catch {
            console.error(`プロジェクト '${projectName}' が見つかりません。`);
            return;
        }
        const zip = new JSZip();

        // 再帰的にファイル・ディレクトリを JSZip インスタンスへ追加
        const addDirectoryToZip = async (dirHandle: FileSystemDirectoryHandle, zipFolder: JSZip) => {
            for await (const [name, handle] of dirHandle.entries()) {
                if (handle.kind === "file") {
                    const file = await handle.getFile();
                    zipFolder.file(name, file);
                } else if (handle.kind === "directory") {
                    const subZip = zipFolder.folder(name);
                    if (subZip) await addDirectoryToZip(handle, subZip);
                }
            }
        };

        await addDirectoryToZip(targetDir, zip);

        // Blob化してブラウザダウンロードをキック
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = zipFileName.endsWith(".zip") ? zipFileName : `${zipFileName}.zip`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async pickRootDirectory(): Promise<void> {
        if (!("showDirectoryPicker" in window)) {
            throw new Error(
                "このブラウザは File System Access API (showDirectoryPicker) に対応していません。Chrome/Edge をお使いください。"
            );
        }
        // showDirectoryPicker is not in the default lib.dom typings used by every
        // TS version, so we access it defensively.
        const picker = (
            window as unknown as {
                showDirectoryPicker: (opts?: {
                    mode?: "read" | "readwrite";
                }) => Promise<FileSystemDirectoryHandle>;
            }
        ).showDirectoryPicker;
        this.root = await picker({ mode: "readwrite" });
    }

    private requireRoot(): FileSystemDirectoryHandle {
        if (!this.root) {
            throw new Error("プロジェクトフォルダが選択されていません。先にフォルダを選択してください。");
        }
        return this.root;
    }

    /** Resolve (creating if necessary) all directory segments of a relative path, returning the parent dir handle and file name. */
    private async resolveParent(
        relativePath: string,
        create: boolean
    ): Promise<{ dir: FileSystemDirectoryHandle; fileName: string }> {
        const root = this.requireRoot();
        const parts = relativePath.split("/").filter(Boolean);
        const fileName = parts.pop();
        if (!fileName) throw new Error(`不正なパスです: ${relativePath}`);
        let dir = root;
        for (const part of parts) {
            dir = await dir.getDirectoryHandle(part, { create });
        }
        return { dir, fileName };
    }

    async exists(relativePath: string): Promise<boolean> {
        try {
            const { dir, fileName } = await this.resolveParent(relativePath, false);
            await dir.getFileHandle(fileName);
            return true;
        } catch {
            return false;
        }
    }

    async readText(relativePath: string): Promise<string> {
        const { dir, fileName } = await this.resolveParent(relativePath, false);
        const fileHandle = await dir.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return await file.text();
    }

    async writeText(relativePath: string, content: string): Promise<void> {
        const { dir, fileName } = await this.resolveParent(relativePath, true);
        const fileHandle = await dir.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }

    async readJSON<T>(relativePath: string): Promise<T | null> {
        if (!(await this.exists(relativePath))) return null;
        const text = await this.readText(relativePath);
        return JSON.parse(text) as T;
    }

    async writeJSON(relativePath: string, data: unknown): Promise<void> {
        await this.writeText(relativePath, JSON.stringify(data, null, 2));
    }

    /** List file names (not directories) directly inside a relative directory, or [] if it doesn't exist. */
    async listDir(relativeDir: string): Promise<string[]> {
        const root = this.requireRoot();
        let dir = root;
        const parts = relativeDir.split("/").filter(Boolean);
        try {
            for (const part of parts) {
                dir = await dir.getDirectoryHandle(part, { create: false });
            }
        } catch {
            return [];
        }
        const names: string[] = [];
        for await (const [name, handle] of dir.entries()) {
            if (handle.kind === "file") names.push(name);
        }
        return names;
    }
}
