import Sortable from "sortablejs";
import { type JsonData, type Schema, type FieldType, type NodeRenderContext } from "../types";
import { getItemSummaryTitle, createDefaultValue, autoResizeTextarea } from "../utils";

export function createArrayNode(
    data: JsonData,
    schema: Schema,
    updateParent: (v: JsonData) => void,
    ctx: NodeRenderContext,
    overrideFieldType?: FieldType,
    keyName?: string
): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "je-array";
    const itemSchema = schema[0];
    const isPrimitiveArray =
        typeof itemSchema === "string" || typeof itemSchema === "number" || typeof itemSchema === "boolean";
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

    if (!isPrimitiveArray) {
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
    (list as JsonData)._dataArray = data;

    if (!Array.isArray(data) || data.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "je-empty";
        emptyMsg.textContent = "（項目なし）";
        list.appendChild(emptyMsg);
    } else {
        data.forEach((_item: JsonData, index: number) => {
            if (isPrimitiveArray) {
                list.appendChild(buildPrimitiveRow(data, index, itemSchema, ctx, overrideFieldType));
            } else {
                list.appendChild(buildCard(data, index, itemSchema, ctx, toggleFns));
            }
        });
    }
    wrapper.appendChild(list);

    const sortableGroup = `group_${keyName ?? Math.random().toString(36).slice(2)}`;
    const sortable = Sortable.create(list, {
        group: sortableGroup,
        handle: ".je-handle",
        animation: 150,
        onEnd: (evt) => {
            const fromArray = (evt.from as JsonData)._dataArray;
            const toArray = (evt.to as JsonData)._dataArray;
            if (fromArray && toArray && evt.oldIndex !== undefined && evt.newIndex !== undefined) {
                const [movedItem] = fromArray.splice(evt.oldIndex, 1);
                toArray.splice(evt.newIndex, 0, movedItem);
                ctx.renderRoot();
                ctx.onCommit();
            }
        },
    });
    ctx.registerSortable(sortable);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "je-add";
    addBtn.textContent = "+ 項目を追加";
    addBtn.onclick = () => {
        const target = Array.isArray(data) ? data : [];
        const newItem = createDefaultValue(itemSchema);
        target.push(newItem);
        (target as JsonData)._shouldFocus = true;
        updateParent(target);
        ctx.renderRoot();
        ctx.onCommit();
    };
    wrapper.appendChild(addBtn);
    return wrapper;
}

function buildPrimitiveRow(
    data: JsonData[],
    index: number,
    itemSchema: Schema,
    ctx: NodeRenderContext,
    overrideFieldType: FieldType | undefined
): HTMLElement {
    const row = document.createElement("div");
    row.className = "je-prim-row";
    const handle = document.createElement("div");
    handle.className = "je-handle";
    handle.textContent = "⋮⋮";

    const inputNode = ctx.createNode(
        data[index],
        itemSchema,
        (val) => {
            data[index] = val;
        },
        overrideFieldType
    );
    inputNode.style.flex = "1";
    inputNode.style.minWidth = "0";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "je-btn danger";
    delBtn.textContent = "削除";
    delBtn.onclick = (e) => {
        e.stopPropagation();
        data.splice(index, 1);
        ctx.renderRoot();
        ctx.onCommit();
    };

    row.appendChild(handle);
    row.appendChild(inputNode);
    row.appendChild(delBtn);

    if ((data as JsonData)._shouldFocus && index === data.length - 1) {
        delete (data as JsonData)._shouldFocus;
        setTimeout(() => {
            const firstInput = row.querySelector<HTMLInputElement | HTMLTextAreaElement>(
                'input:not([type="file"]), textarea'
            );
            firstInput?.focus();
            if (firstInput && typeof firstInput.select === "function") firstInput.select();
        }, 0);
    }
    return row;
}

function buildCard(
    data: JsonData[],
    index: number,
    itemSchema: Schema,
    ctx: NodeRenderContext,
    toggleFns: Array<(collapse: boolean) => void>
): HTMLElement {
    const item = data[index];
    const card = document.createElement("div");
    card.className = "je-card";

    const cardHeader = document.createElement("div");
    cardHeader.className = "je-card-head";
    const handle = document.createElement("div");
    handle.className = "je-handle";
    handle.textContent = "⋮⋮";

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "je-card-toggle";

    const titleSpan = document.createElement("span");
    titleSpan.className = "je-card-title";
    titleSpan.textContent = getItemSummaryTitle(item, index, itemSchema);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "je-btn danger";
    delBtn.textContent = "削除";
    delBtn.onclick = (e) => {
        e.stopPropagation();
        data.splice(index, 1);
        ctx.renderRoot();
        ctx.onCommit();
    };

    cardHeader.appendChild(handle);
    cardHeader.appendChild(toggleIcon);
    cardHeader.appendChild(titleSpan);
    cardHeader.appendChild(delBtn);

    const cardBody = document.createElement("div");
    cardBody.className = "je-card-body";
    const handleHeaderTitleUpdate = () => {
        titleSpan.textContent = getItemSummaryTitle(data[index], index, itemSchema);
    };

    cardBody.appendChild(
        ctx.createNode(data[index], itemSchema, (val) => {
            data[index] = val;
        })
    );
    cardBody.addEventListener("focusout", handleHeaderTitleUpdate, true);

    if ((data as JsonData)._shouldFocus && index === data.length - 1) {
        delete (data as JsonData)._shouldFocus;
        setTimeout(() => {
            const firstInput = cardBody.querySelector<HTMLInputElement | HTMLTextAreaElement>(
                'input:not([type="file"]), textarea'
            );
            firstInput?.focus();
            if (firstInput && typeof firstInput.select === "function") firstInput.select();
        }, 0);
    }

    const setCollapseState = (collapse: boolean) => {
        if (typeof item === "object" && item !== null) item._isCollapsed = collapse;
        card.classList.toggle("collapse", collapse);
        toggleIcon.textContent = collapse ? "▶" : "▼";
        if (collapse) {
            titleSpan.textContent = getItemSummaryTitle(data[index], index, itemSchema);
        } else {
            setTimeout(() => {
                cardBody.querySelectorAll("textarea").forEach((ta) => autoResizeTextarea(ta as HTMLTextAreaElement));
            }, 0);
        }
    };

    setCollapseState(!!item?._isCollapsed);
    cardHeader.onclick = (e) => {
        if ((e.target as HTMLElement).classList.contains("je-handle")) return;
        setCollapseState(!item?._isCollapsed);
    };
    toggleFns.push(setCollapseState);

    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    return card;
}
