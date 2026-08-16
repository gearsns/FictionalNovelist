import { type JsonData, type Schema, type NodeRenderContext } from "../types";
import { createDefaultValue, autoResizeTextarea } from "../utils";

export function createDynamicObjectNode(
    data: JsonData,
    schema: Schema,
    updateParent: (v: JsonData) => void,
    ctx: NodeRenderContext,
    keyName?: string
): HTMLElement {
    const itemSchema = schema["*"];
    const isBooleanMap = typeof itemSchema === "boolean";
    const obj: JsonData = typeof data === "object" && data !== null && !Array.isArray(data) ? data : {};
    if (obj !== data) {
        updateParent(obj);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "je-array";
    const toggleFns: Array<(collapse: boolean) => void> = [];

    const headerRow = document.createElement("div");
    headerRow.className = "je-array-head";
    if (keyName) {
        const label = document.createElement("span");
        label.className = "je-label";
        label.style.marginBottom = "0";
        label.textContent = keyName;
        headerRow.appendChild(label);
    } else {
        headerRow.appendChild(document.createElement("div"));
    }

    const keys = Object.keys(obj).filter((k) => !k.startsWith("_"));
    if (keys.length > 0 && !isBooleanMap) {
        const controlBar = document.createElement("div");
        controlBar.style.cssText = "display:flex; gap:8px;";
        const collapseAllBtn = document.createElement("button");
        collapseAllBtn.type = "button";
        collapseAllBtn.className = "je-btn";
        collapseAllBtn.textContent = "▶ 全てたたむ";

        const expandAllBtn = document.createElement("button");
        expandAllBtn.type = "button";
        expandAllBtn.className = "je-btn";
        expandAllBtn.textContent = "▼ 全て開く";

        collapseAllBtn.onclick = () => toggleFns.forEach((fn) => fn(true));
        expandAllBtn.onclick = () => toggleFns.forEach((fn) => fn(false));
        controlBar.appendChild(collapseAllBtn);
        controlBar.appendChild(expandAllBtn);
        headerRow.appendChild(controlBar);
    }
    wrapper.appendChild(headerRow);

    const list = document.createElement("div");
    list.className = "je-list";
    if (keys.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "je-empty";
        emptyMsg.textContent = "（項目なし）";
        list.appendChild(emptyMsg);
    } else {
        keys.forEach((key) => {
            list.appendChild(
                isBooleanMap
                    ? buildDynamicBooleanRow(obj, key, ctx)
                    : buildDynamicCard(obj, key, itemSchema, ctx, toggleFns)
            );
        });
    }
    wrapper.appendChild(list);

    const addRow = document.createElement("div");
    addRow.className = "je-add-row";
    const newKeyInput = document.createElement("input");
    newKeyInput.type = "text";
    newKeyInput.placeholder = "新しいキー名（例: キャラクター名）";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "je-add";
    addBtn.style.marginTop = "0";
    addBtn.textContent = "+ 項目を追加";

    const doAdd = () => {
        const newKey = newKeyInput.value.trim();
        if (!newKey) {
            newKeyInput.focus();
            return;
        }
        if (Object.prototype.hasOwnProperty.call(obj, newKey)) {
            alert(`「${newKey}」は既に存在します。`);
            return;
        }
        obj[newKey] = createDefaultValue(itemSchema);
        updateParent(obj);
        ctx.renderRoot();
        ctx.onCommit();
    };

    addBtn.onclick = doAdd;
    newKeyInput.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            doAdd();
        }
    };

    addRow.appendChild(newKeyInput);
    addRow.appendChild(addBtn);
    wrapper.appendChild(addRow);
    return wrapper;
}

function buildDynamicBooleanRow(obj: JsonData, key: string, ctx: NodeRenderContext): HTMLElement {
    const row = document.createElement("div");
    row.className = "je-prim-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!obj[key];
    checkbox.style.cssText = "width:auto; flex:none; accent-color: var(--brass, #c9a24b);";
    checkbox.onchange = () => {
        obj[key] = checkbox.checked;
        ctx.onCommit();
    };

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.className = "je-key-input";
    keyInput.value = key;
    keyInput.onchange = () => {
        const newKey = keyInput.value.trim();
        if (!newKey || newKey === key) {
            keyInput.value = key;
            return;
        }
        if (Object.prototype.hasOwnProperty.call(obj, newKey)) {
            alert(`「${newKey}」は既に存在します。`);
            keyInput.value = key;
            return;
        }
        const value = obj[key];
        delete obj[key];
        obj[newKey] = value;
        ctx.renderRoot();
        ctx.onCommit();
    };

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "je-btn danger";
    delBtn.textContent = "削除";
    delBtn.onclick = () => {
        delete obj[key];
        ctx.renderRoot();
        ctx.onCommit();
    };

    row.appendChild(checkbox);
    row.appendChild(keyInput);
    row.appendChild(delBtn);
    return row;
}

function buildDynamicCard(
    obj: JsonData,
    key: string,
    itemSchema: Schema,
    ctx: NodeRenderContext,
    toggleFns: Array<(collapse: boolean) => void>
): HTMLElement {
    const collapseKey = `_collapsed:${key}`;
    const card = document.createElement("div");
    card.className = "je-card";

    const cardHeader = document.createElement("div");
    cardHeader.className = "je-card-head";
    const toggleIcon = document.createElement("span");
    toggleIcon.className = "je-card-toggle";

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.className = "je-key-input";
    keyInput.value = key;
    keyInput.onclick = (e) => e.stopPropagation();
    keyInput.onkeydown = (e) => e.stopPropagation();
    keyInput.onchange = () => {
        const newKey = keyInput.value.trim();
        if (!newKey || newKey === key) {
            keyInput.value = key;
            return;
        }
        if (Object.prototype.hasOwnProperty.call(obj, newKey)) {
            alert(`「${newKey}」は既に存在します。`);
            keyInput.value = key;
            return;
        }
        const value = obj[key];
        const wasCollapsed = obj[collapseKey];
        delete obj[key];
        delete obj[collapseKey];
        obj[newKey] = value;
        if (wasCollapsed) obj[`_collapsed:${newKey}`] = true;
        ctx.renderRoot();
        ctx.onCommit();
    };

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "je-btn danger";
    delBtn.textContent = "削除";
    delBtn.onclick = (e) => {
        e.stopPropagation();
        delete obj[key];
        ctx.renderRoot();
        ctx.onCommit();
    };

    cardHeader.appendChild(toggleIcon);
    cardHeader.appendChild(keyInput);
    cardHeader.appendChild(delBtn);

    const cardBody = document.createElement("div");
    cardBody.className = "je-card-body";
    cardBody.appendChild(
        ctx.createNode(obj[key], itemSchema, (val) => {
            obj[key] = val;
        })
    );

    const setCollapseState = (collapse: boolean) => {
        if (collapse) {
            obj[collapseKey] = true;
        } else {
            delete obj[collapseKey];
        }
         card.classList.toggle("collapse", collapse);
        toggleIcon.textContent = collapse ? "▶" : "▼";
        if (!collapse) {
            setTimeout(() => {
                cardBody.querySelectorAll("textarea").forEach((ta) => autoResizeTextarea(ta as HTMLTextAreaElement));
            }, 0);
        }
    };

    setCollapseState(!!obj[collapseKey]);
    cardHeader.onclick = (e) => {
        if (e.target === keyInput || e.target === delBtn) return;
        setCollapseState(!obj[collapseKey]);
    };
    toggleFns.push(setCollapseState);

    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    return card;
}
