import { type JsonData, type Schema, type FieldType, type NodeRenderContext } from "../types";
import { createDefaultValue, isDynamicObjectSchema } from "../utils";

export function createObjectNode(
    data: JsonData,
    schema: Schema,
    _updateParent: (v: JsonData) => void,
    ctx: NodeRenderContext
): HTMLElement {
    const container = document.createElement("div");
    container.className = "je-obj";
    const fieldTypes: Record<string, FieldType> = schema._fieldTypes || {};

    Object.keys(schema).forEach((key) => {
        if (key.startsWith("_")) return;
        const field = document.createElement("div");
        field.className = "je-field";
        if (!(key in data)) data[key] = createDefaultValue(schema[key]);

        const isArray = Array.isArray(schema[key]);
        const isDynamic = isDynamicObjectSchema(schema[key]);
        if (!isArray && !isDynamic) {
            const label = document.createElement("label");
            label.className = "je-label";
            label.textContent = key;
            field.appendChild(label);
        }

        const inputNode = ctx.createNode(
            data[key],
            schema[key],
            (val) => {
                data[key] = val;
            },
            fieldTypes[key],
            key
        );
        field.appendChild(inputNode);
        container.appendChild(field);
    });
    return container;
}
