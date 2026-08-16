export function stepHtml(numeral: string, id: string, label: string, sub: string): string {
    return `
    <div class="step${id === "prep" ? " active" : ""}" data-step="${id}">
      <span class="numeral">${numeral}</span>
      <div>
        <span class="label">${label}</span>
        <span class="sub">${sub}</span>
      </div>
      <span class="check" data-check="${id}"></span>
    </div>
  `;
}

export function renderRail(): string {
    const steps = [
        { numeral: "壱", id: "prep", label: "準備", sub: "フォルダ・設定" },
        { numeral: "弐", id: "init", label: "初期化", sub: "プロット・人物・世界観" },
        { numeral: "参", id: "outline", label: "アウトライン", sub: "章とシーンの構成" },
        { numeral: "四", id: "write", label: "執筆", sub: "シーンを生成" },
        { numeral: "伍", id: "reconstruct", label: "状態再構築", sub: "手動編集後の整合" },
        { numeral: "六", id: "edit", label: "編集", sub: "JSON・Markdownを手直し" },
        { numeral: "七", id: "convert", label: "変換", sub: "ファイル形式の変換" },
    ];

    return `
    <nav class="rail" id="rail">
      <div class="rail-title">目次 · Table of Contents</div>
      ${steps.map((s) => stepHtml(s.numeral, s.id, s.label, s.sub)).join("")}
    </nav>
  `;
}
