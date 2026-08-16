import { type JsonData, type Schema, type FieldType, type NodeRenderContext } from "../types";
import { isDynamicObjectSchema } from "../utils";
import { createNumberNode, createBooleanNode, createStringNode } from "./primitive";
import { createArrayNode } from "./array";
import { createObjectNode } from "./object";
import { createDynamicObjectNode } from "./dynamic";

export function createNode(
    data: JsonData,
    schema: Schema,
    updateParent: (v: JsonData) => void,
    ctx: NodeRenderContext,
    overrideFieldType?: FieldType,
    keyName?: string
): HTMLElement {
    if (Array.isArray(schema)) {
        return createArrayNode(data, schema, updateParent, ctx, overrideFieldType, keyName);
    }
    if (isDynamicObjectSchema(schema)) {
        return createDynamicObjectNode(data, schema, updateParent, ctx, keyName);
    }
    if (typeof schema === "object" && schema !== null) {
        return createObjectNode(data, schema, updateParent, ctx);
    }
    if (typeof schema === "number") {
        return createNumberNode(data, updateParent, ctx);
    }
    if (typeof schema === "boolean") {
        return createBooleanNode(data, updateParent, ctx);
    }
    return createStringNode(data, schema, updateParent, ctx, overrideFieldType);
}
