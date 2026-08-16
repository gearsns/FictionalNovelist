import { FsManager } from "../../services/fsManager";
import HTML from "./index.html?raw"
import STYLE from "./styles.css?inline"

export class OpfsWorkspaceElement extends HTMLElement {
    private fs = new FsManager();
    private workBase = "Fictional Novelist";
    private currentProject = "";

    // Shadow DOM 要素の参照
    private projectSelect!: HTMLSelectElement;
    private newDirInput!: HTMLInputElement;
    private currentPathEl!: HTMLElement;

    // 監視する属性を定義
    static get observedAttributes() {
        return ["init-project"];
    }
    get initProject(): string {
        return this.getAttribute("init-project") || "";
    }
    set initProject(val: string) {
        this.setAttribute("init-project", val);
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.render();
        this.bindEvents();
        this.init();
    }
    public close() {
        this.remove();
    }

    private render() {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(STYLE);
        this.shadowRoot!.innerHTML = HTML;
        this.shadowRoot!.adoptedStyleSheets = [sheet];

        // 参照を取得
        const root = this.shadowRoot!;
        this.projectSelect = root.querySelector("#project-select")!;
        this.newDirInput = root.querySelector("#new-dir-input")!;
        this.currentPathEl = root.querySelector("#current-path")!;
    }

    private bindEvents() {
        const root = this.shadowRoot!;

        // 背景（黒いオーバーレイ部分）が直接クリックされたら閉じる
        root.querySelector("#overlay")!.addEventListener("click", (e) => {
            if (e.target === e.currentTarget) {
                this.close();
            }
        });
        // 右上の '×' 閉じるボタンで閉じる
        root.querySelector("#btn-close")!.addEventListener("click", () => {
            this.close();
        });
        // 開く
        root.querySelector("#btn-open")!.addEventListener("click", () => {
            const selected = this.projectSelect.value;
            if (!selected) {
                return alert("開くプロジェクトを選択してください。");
            }
            this.openProject(selected);
        });

        // 削除
        root.querySelector("#btn-delete")!.addEventListener("click", async () => {
            const selected = this.projectSelect.value;
            if (!selected) {
                return alert("削除するプロジェクトが選択されていません。");
            }

            if (confirm(`フォルダ "${selected}" を配下のファイルごと削除しますか？`)) {
                await this.fs.initOpfs(this.workBase);
                await this.fs.deleteEntry(selected);
                if (this.currentProject === selected) {
                    this.currentProject = "";
                    this.currentPathEl.textContent = "未選択";
                }
                await this.refreshProjectList();
            }
        });

        // 新規作成
        root.querySelector("#btn-create")!.addEventListener("click", async () => {
            const name = this.newDirInput.value.trim();
            if (!name) return;

            await this.fs.initOpfs(this.workBase);
            await this.fs.createDirectory(name);
            this.newDirInput.value = "";
            await this.refreshProjectList();
        });

        // ZIPダウンロード
        root.querySelector("#btn-download")!.addEventListener("click", async () => {
            if (!this.fs.isReady || !this.currentProject) {
                return alert("ダウンロードするプロジェクトを選択してください");
            }
            await this.fs.exportZip(this.currentProject, `${this.currentProject}.zip`);
        });

        this.projectSelect.addEventListener("change", () => {
            this.currentPathEl.textContent = this.projectSelect.value;
            this.currentProject = this.projectSelect.value;
        });
    }

    private async init() {
        await this.refreshProjectList();
    }

    private async refreshProjectList() {
        await this.fs.initOpfs(this.workBase);
        const projects = await this.fs.listSubdirectories();

        this.projectSelect.innerHTML = "";
        if (projects.length === 0) {
            this.projectSelect.innerHTML = '<option value="">(フォルダなし)</option>';
            return;
        }

        // デフォルト選択肢を追加
        const defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "-- プロジェクトを選択 --";
        this.projectSelect.appendChild(defaultOpt);

        const savedProject =
            this.initProject || localStorage.getItem("opfs_last_project") || "";

        projects.forEach((name) => {
            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = name;
            if (name === savedProject) {
                opt.selected = true;
            }
            this.projectSelect.appendChild(opt);
        });
        this.currentPathEl.textContent = this.projectSelect.value;
        this.currentProject = this.projectSelect.value;
    }

    private async openProject(projectName: string) {
        this.currentProject = projectName;
        const targetPath = `${this.workBase}/${projectName}`;
        await this.fs.initOpfs(targetPath);
        this.currentPathEl.textContent = projectName;

        localStorage.setItem("opfs_last_project", projectName);
        // 外部へ「開いたこと」を通知するコールバック（CustomEvent）
        this.dispatchEvent(
            new CustomEvent("project-opened", {
                detail: { projectName, path: targetPath },
                bubbles: true,
                composed: true, // Shadow DOM を越えて外側にイベントを伝える
            })
        );
    }
}

// カスタムエレメントとして登録
customElements.define("opfs-workspace", OpfsWorkspaceElement);

declare global {
    interface HTMLElementTagNameMap {
        "opfs-workspace": OpfsWorkspaceElement;
    }
}
