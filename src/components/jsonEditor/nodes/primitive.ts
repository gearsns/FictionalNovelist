import { type JsonData, type Schema, type FieldType, type NodeRenderContext } from "../types";
import { autoResizeTextarea } from "../utils";

export function createNumberNode(
    data: JsonData,
    updateParent: (v: JsonData) => void,
    ctx: NodeRenderContext
): HTMLElement {
    const input = document.createElement("input");
    input.type = "number";
    input.value = String(data ?? 0);
    input.oninput = (e) => updateParent(Number((e.target as HTMLInputElement).value));
    input.onblur = () => ctx.onCommit();
    input.onchange = () => ctx.onCommit();
    return input;
}

export function createBooleanNode(
    data: JsonData,
    updateParent: (v: JsonData) => void,
    ctx: NodeRenderContext
): HTMLElement {
    const row = document.createElement("label");
    row.className = "je-bool-row";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!data;
    const status = document.createElement("span");
    status.textContent = input.checked ? "true" : "false";

    input.onchange = () => {
        status.textContent = input.checked ? "true" : "false";
        updateParent(input.checked);
        ctx.onCommit();
    };
    row.appendChild(input);
    row.appendChild(status);
    return row;
}

export function createStringNode(
    data: JsonData,
    schema: Schema,
    updateParent: (v: JsonData) => void,
    ctx: NodeRenderContext,
    overrideFieldType?: FieldType
): HTMLElement {
    const valueStr = String(Array.isArray(data) ? data.join("\n") : data ?? "");
    const isLongText =
        overrideFieldType === "textarea"
            ? true
            : overrideFieldType === "input"
                ? false
                : valueStr.length > 30 || schema === "summary" || schema === "history";

    if (isLongText) {
        const textarea = document.createElement("textarea");
        textarea.value = valueStr;
        textarea.rows = 1;
        textarea.oninput = (e) => {
            autoResizeTextarea(textarea);
            updateParent((e.target as HTMLTextAreaElement).value);
        };
        textarea.onfocus = () => autoResizeTextarea(textarea);
        textarea.onblur = () => ctx.onCommit();
        textarea.onchange = () => ctx.onCommit();
        setTimeout(() => autoResizeTextarea(textarea), 0);
        return textarea;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.value = valueStr;
    input.oninput = (e) => updateParent((e.target as HTMLInputElement).value);
    input.onblur = () => ctx.onCommit();
    input.onchange = () => ctx.onCommit();
    return input;
}
