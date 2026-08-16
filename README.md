# Fictional Novelist — ローカルLLM小説執筆エンジン

TypeScript + Vite (vanilla) + ローカル Ollama で動く、長編小説の自動執筆ツールです。  
元になった [Python 版 CLI(久道秀作氏作)](https://github.com/KudoShusak/NovelWriter)（`init` / `outline` / `write` / `reconstruct`）の処理をブラウザ上に移植しています。  
ファイルはサーバーに送信されず、**File System Access API (`showDirectoryPicker`)** を使って  
選択したローカルフォルダに直接読み書きします。

## GitHubのページから直接使用する場合

[Fictional Novelist](https://gearsns.github.io/FictionalNovelist/index.html)にアクセス

### Ollama 側の設定（CORS）

ブラウザの `https://gearsns.github.io/FictionalNovelist` から直接 `http://127.0.0.1:11434` を叩くため、
Ollama にこのオリジンからのアクセスを許可する必要がある場合があります。

```bash
OLLAMA_ORIGINS="https://gearsns.github.io" ollama serve
```

（環境によっては `OLLAMA_ORIGINS="*"` が必要な場合もあります。）
 
## ビルドする場合

### 必要なもの

- Node.js 20+ / pnpm
- [Ollama](https://ollama.com/) がローカルで起動していること（`ollama serve`）
- 使用したいモデルを事前に取得: `ollama pull llama3.1` など
- **Chrome または Edge の最新版**（File System Access API 対応ブラウザ。Firefox / Safari は未対応です）

### セットアップ

```bash
pnpm install
pnpm dev
```

ブラウザで表示された URL（既定は http://localhost:5173 ）を開いてください。

### Ollama 側の設定（CORS）

ブラウザの `http://localhost:5173` から直接 `http://127.0.0.1:11434` を叩くため、
Ollama にこのオリジンからのアクセスを許可する必要がある場合があります。

```bash
OLLAMA_ORIGINS="http://localhost:5173" ollama serve
```

（環境によっては `OLLAMA_ORIGINS="*"` が必要な場合もあります。）


## ビルド

```bash
pnpm build
pnpm preview
```

## 使い方

1. **準備**: 「フォルダを選択」でプロジェクト用のローカルフォルダを指定し、Ollama のホスト / モデル名 /
   視点・文体などを設定します。「接続テスト」で疎通確認ができます。
2. **初期化**: 小説のアイデアを入力（またはテキスト/Markdown/JSONファイルを読み込み）して実行すると、
   `plot.md` / `characters.json` / `world.json` を生成します。既に存在するファイルはスキップされます。
3. **アウトライン**: プロット・人物・世界観をもとに章立て（`outline.json`）を生成します。
4. **執筆**: 指定したシーン数だけ、アウトラインの未執筆シーンを順番に執筆します。各シーンは
   `drafts/scene_{id}.md` として保存され、要約は `drafts/scene_{id}_summary.txt`、
   物語全体の状態は `state.json` と `state_snapshots/state_{id}.json` に保存されます。
5. **状態再構築**: 原稿を手動編集した後、指定したシーンIDまでの状態と要約を再生成し、
   物語全体の整合性を保ちます。既存のスナップショットがあれば、そこから再開して再計算を省略します。
6. **編集**: 自動生成されたプロット・人物・世界観・シーンなどのファイルを編集することができます。
7. **変換**: markdown形式を、小説家になろうやカクヨムの形式に変換します。

## 生成されるファイル構成

```
（選択したフォルダ）/
├── plot.md
├── characters.json
├── world.json
├── outline.json
├── state.json
├── drafts/
│   ├── scene_1.md
│   ├── scene_1_summary.txt
│   └── ...
└── state_snapshots/
    ├── state_1.json
    └── ...
```


---

## License & Credits

本プロジェクトは、MITライセンスのもとで公開されている [NovelWriter](https://github.com/KudoShusak/NovelWriter) のコード/設計をベースに作成されています。

* **Original Work:** [NovelWriter](https://github.com/KudoShusak/NovelWriter)
* **Original Author:** 久道秀作氏
* **Copyright:** Copyright (c) 2025 久道秀作

本プロジェクト自体のライセンスについては [LICENSE](./LICENSE) をご確認ください。
