import type { NoteTemplateInput } from "@/lib/note-templates";

export const DEFAULT_TEMPLATES: NoteTemplateInput[] = [
  {
    name: "Standard Lesson",
    sections: [
      {
        id: "covered",
        type: "bullets",
        title: "Covered in this lesson",
        items: [],
      },
      {
        id: "notes",
        type: "text",
        title: "Teacher's Notes",
        placeholder: "Observations, feedback, how it went...",
      },
      {
        id: "assignments",
        type: "bullets",
        title: "Assignments",
        items: [],
      },
      {
        id: "links",
        type: "bullets",
        title: "Links",
        items: [],
      },
      {
        id: "other",
        type: "text",
        title: "Other",
        placeholder: "Anything else...",
      },
    ],
  },
  {
    name: "Quick Note",
    sections: [
      {
        id: "note",
        type: "text",
        title: "Lesson Note",
        placeholder: "Quick summary of the lesson...",
      },
    ],
  },
];
