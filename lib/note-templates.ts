import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BulletsSection {
  id: string;
  type: "bullets";
  title: string;
  items: string[]; // default items (usually empty for templates)
}

export interface GroupedBulletsSection {
  id: string;
  type: "grouped_bullets";
  title: string;
  groups: { name: string; items: string[] }[];
}

export interface TextSection {
  id: string;
  type: "text";
  title: string;
  placeholder?: string;
  value?: string;
}

export type NoteSection = BulletsSection | GroupedBulletsSection | TextSection;

export interface NoteTemplate {
  id: string;
  user_id: string;
  name: string;
  sections: NoteSection[];
  created_at: string;
  updated_at: string;
}

export type NoteTemplateInput = Pick<NoteTemplate, "name" | "sections">;

// Filled values keyed by section id. Mirrors section.type.
export type FilledValues = Record<
  string,
  string | string[] | { name: string; items: string[] }[]
>;

// ── Markdown rendering ────────────────────────────────────────────────────────

export function renderTemplateToMarkdown(
  template: NoteTemplateInput,
  filled: FilledValues
): string {
  const parts: string[] = [];
  for (const section of template.sections) {
    parts.push(`## ${section.title}`);
    parts.push("");

    if (section.type === "text") {
      const v = (filled[section.id] as string | undefined) ?? "";
      parts.push(v.trim() || "_(none)_");
    } else if (section.type === "bullets") {
      const items = ((filled[section.id] as string[] | undefined) ?? []).filter(
        (i) => i.trim()
      );
      if (items.length === 0) parts.push("_(none)_");
      else for (const it of items) parts.push(`- ${it}`);
    } else if (section.type === "grouped_bullets") {
      const groups =
        (filled[section.id] as { name: string; items: string[] }[] | undefined) ??
        [];
      const nonEmpty = groups.filter(
        (g) => g.name.trim() || g.items.some((i) => i.trim())
      );
      if (nonEmpty.length === 0) {
        parts.push("_(none)_");
      } else {
        for (const g of nonEmpty) {
          parts.push(`**${g.name}**`);
          const items = g.items.filter((i) => i.trim());
          for (const it of items) parts.push(`- ${it}`);
          parts.push("");
        }
      }
    }
    parts.push("");
  }
  return parts.join("\n").trim() + "\n";
}

// ── Validation (manual; no zod dependency) ────────────────────────────────────

export function validateTemplateInput(raw: unknown): NoteTemplateInput {
  if (!raw || typeof raw !== "object") throw new Error("Template must be an object");
  const o = raw as Record<string, unknown>;
  if (typeof o.name !== "string" || !o.name.trim())
    throw new Error("Template name is required");
  if (!Array.isArray(o.sections)) throw new Error("sections must be an array");

  const sections: NoteSection[] = o.sections.map((s, i) => {
    if (!s || typeof s !== "object") throw new Error(`Section ${i} invalid`);
    const sec = s as Record<string, unknown>;
    const id = typeof sec.id === "string" && sec.id ? sec.id : `s${i}`;
    const title = typeof sec.title === "string" ? sec.title : "";
    if (!title) throw new Error(`Section ${i} missing title`);
    const type = sec.type;
    if (type === "text") {
      return {
        id,
        type: "text",
        title,
        placeholder: typeof sec.placeholder === "string" ? sec.placeholder : undefined,
      };
    }
    if (type === "bullets") {
      const items = Array.isArray(sec.items)
        ? sec.items.filter((x): x is string => typeof x === "string")
        : [];
      return { id, type: "bullets", title, items };
    }
    if (type === "grouped_bullets") {
      const groups = Array.isArray(sec.groups)
        ? sec.groups.map((g, gi) => {
            if (!g || typeof g !== "object") throw new Error(`Group ${gi} invalid`);
            const gr = g as Record<string, unknown>;
            return {
              name: typeof gr.name === "string" ? gr.name : "",
              items: Array.isArray(gr.items)
                ? gr.items.filter((x): x is string => typeof x === "string")
                : [],
            };
          })
        : [];
      return { id, type: "grouped_bullets", title, groups };
    }
    throw new Error(`Section ${i} has unknown type: ${String(type)}`);
  });

  return { name: o.name.trim(), sections };
}

// ── CRUD: client ──────────────────────────────────────────────────────────────

export async function listTemplatesClient(): Promise<NoteTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("note_templates")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as NoteTemplate[];
}

export async function createTemplateClient(
  input: NoteTemplateInput
): Promise<NoteTemplate> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("note_templates")
    .insert({ user_id: user.id, name: input.name, sections: input.sections })
    .select()
    .single();
  if (error) throw error;
  return data as NoteTemplate;
}

export async function updateTemplateClient(
  id: string,
  input: NoteTemplateInput
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("note_templates")
    .update({
      name: input.name,
      sections: input.sections,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTemplateClient(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("note_templates").delete().eq("id", id);
  if (error) throw error;
}

