// Schema templates fed into the <json-editor> web component. See
// jsonEditor.ts for the schema convention (arrays = repeatable list,
// _titleKeys = collapsed card title, _fieldTypes = force input/textarea,
// "*" = dynamic-key object / map, where the user names each entry's key).
export const CHARACTERS_SCHEMA = [
  {
    _titleKeys: ["name", "role"],
    _fieldTypes: { personality: "textarea" },
    name: "",
    age: "",
    role: "",
    personality: "",
    first_person: "",
    second_person: "",
    speech_examples: [""],
  },
];
export const WORLD_SCHEMA = {
  _fieldTypes: {
    history: "textarea",
    magic_system: "textarea",
    important_rules: "textarea",
  },
  location_names: [""],
  history: "",
  magic_system: "",
  important_rules: "",
};
export const OUTLINE_SCHEMA = [
  {
    _titleKeys: ["chapter_title"],
    chapter_title: "",
    scenes: [
      {
        _titleKeys: ["scene_id", "summary"],
        _fieldTypes: { summary: "textarea", location: "input", note: "textarea" },
        scene_id: 1,
        summary: "",
        characters_involved: [""],
        location: "",
        note: "",
      },
    ],
  },
];
// Matches NovelState (types.ts): characters keyed by character name, flags
// keyed by an arbitrary flag name. The "*" key tells <json-editor> that this
// is a dynamic-key object — the user adds/removes/renames entries by name
// rather than the fields being fixed ahead of time.
export const STATE_SCHEMA = {
  characters: {
    "*": {
      location: "",
      status: "",
      inventory: [""],
      experience_log: [""],
    },
  },
  flags: {
    "*": true,
  },
};
