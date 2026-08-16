import type Sortable from "sortablejs";

export type FieldType = "input" | "textarea";

export interface SchemaMeta {
    _titleKeys?: string[];
    _fieldTypes?: Record<string, FieldType>;
}

export type Schema = any;
export type JsonData = any;

export interface NodeRenderContext {
    renderRoot: () => void;
    onCommit: () => void;
    registerSortable: (instance: Sortable) => void;
    createNode: (
        data: JsonData,
        schema: Schema,
        updateParent: (v: JsonData) => void,
        overrideFieldType?: FieldType,
        keyName?: string
    ) => HTMLElement;
}
