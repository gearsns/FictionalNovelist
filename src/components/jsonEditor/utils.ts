export type FieldType = "input" | "textarea";

export interface SchemaMeta {
    _titleKeys?: string[];
    _fieldTypes?: Record<string, FieldType>;
}

export type Schema = any;
export type JsonData = any;

export function isDynamicObjectSchema(schema: Schema): boolean {
    return (
        typeof schema === "object" &&
        schema !== null &&
        !Array.isArray(schema) &&
        Object.prototype.hasOwnProperty.call(schema, "*")
    );
}

export function createDefaultValue(schemaItem: Schema): JsonData {
    if (Array.isArray(schemaItem)) return [];
    if (isDynamicObjectSchema(schemaItem)) return {};
    if (typeof schemaItem === "object" && schemaItem !== null) {
        const obj: JsonData = {};
        for (const k of Object.keys(schemaItem)) {
            if (k.startsWith("_")) continue;
            obj[k] = createDefaultValue(schemaItem[k]);
        }
        return obj;
    }
    if (typeof schemaItem === "number") return 0;
    if (typeof schemaItem === "boolean") return false;
    return "";
}

export function fillMissingFields(data: JsonData, schema: Schema): JsonData {
    if (Array.isArray(schema)) {
        if (!Array.isArray(data)) return [];
        const itemSchema = schema[0];
        if (!itemSchema) return data;
        const result = data.map((item) => fillMissingFields(item, itemSchema)) as JsonData;
        if ((data as JsonData)._shouldFocus) {
            result._shouldFocus = true;
            delete (data as JsonData)._shouldFocus;
        }
        return result;
    }
    if (isDynamicObjectSchema(schema)) {
        if (typeof data !== "object" || data === null || Array.isArray(data)) return {};
        const itemSchema = schema["*"];
        const result: JsonData = {};
        for (const key of Object.keys(data)) {
            result[key] = fillMissingFields(data[key], itemSchema);
        }
        return result;
    }
    if (typeof schema === "object" && schema !== null) {
        const result: JsonData = typeof data === "object" && data !== null ? { ...data } : {};
        for (const key of Object.keys(schema)) {
            if (key.startsWith("_")) continue;
            if (!(key in result) || result[key] === undefined || result[key] === null) {
                result[key] = createDefaultValue(schema[key]);
            } else {
                result[key] = fillMissingFields(result[key], schema[key]);
            }
        }
        return result;
    }
    return data ?? createDefaultValue(schema);
}

export function getItemSummaryTitle(item: JsonData, index: number, schema?: SchemaMeta): string {
    if (typeof item === "string" || typeof item === "number") {
        return String(item) || `項目 ${index + 1}`;
    }
    if (typeof item === "object" && item !== null) {
        if (schema && Array.isArray(schema._titleKeys)) {
            const parts: string[] = [];
            for (const key of schema._titleKeys) {
                if (item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== "") {
                    parts.push(String(item[key]));
                }
            }
            if (parts.length > 0) return parts.join(" : ");
        }
        const keys = schema ? Object.keys(schema).filter((k) => !k.startsWith("_")) : Object.keys(item);
        for (const k of keys) {
            if (item[k] !== undefined && item[k] !== null && String(item[k]).trim() !== "") {
                if (typeof item[k] === "string" || typeof item[k] === "number") return String(item[k]);
            }
        }
    }
    return `項目 ${index + 1}`;
}

export function getCleanJsonString(data: JsonData): string {
    return JSON.stringify(
        data,
        (key, value) => (key.startsWith("_") ? undefined : value),
        2
    );
}

export function cleanValue(data: JsonData): JsonData {
    return JSON.parse(getCleanJsonString(data));
}

export function autoResizeTextarea(textarea: HTMLTextAreaElement) {
    if (textarea.offsetHeight === 0 && textarea.offsetWidth === 0) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
}
