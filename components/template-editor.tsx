"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NoteSection, NoteTemplateInput } from "@/lib/note-templates";

interface Props {
  initial: NoteTemplateInput;
  onSave: (t: NoteTemplateInput) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

function newSection(type: NoteSection["type"]): NoteSection {
  const id = `s${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  if (type === "text") return { id, type, title: "New Section", placeholder: "" };
  if (type === "bullets") return { id, type, title: "New Section", items: [] };
  return { id, type, title: "New Section", groups: [{ name: "Group", items: [] }] };
}

export default function TemplateEditor({ initial, onSave, onCancel, saving }: Props) {
  const [name, setName] = useState(initial.name);
  const [sections, setSections] = useState<NoteSection[]>(initial.sections);

  function updateSection(idx: number, patch: Partial<NoteSection>) {
    setSections((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch } as NoteSection;
      return next;
    });
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[idx], next[j]] = [next[j], next[idx]];
    setSections(next);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Template name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-3">
        {sections.map((section, idx) => (
          <div key={section.id} className="border rounded-lg p-3 space-y-2 bg-white">
            <div className="flex gap-2 items-center">
              <Input
                value={section.title}
                placeholder="Section title"
                onChange={(e) => updateSection(idx, { title: e.target.value })}
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {section.type.replace("_", " ")}
              </span>
              <button
                onClick={() => move(idx, -1)}
                className="text-gray-400 text-xs px-1"
                type="button"
              >
                ↑
              </button>
              <button
                onClick={() => move(idx, 1)}
                className="text-gray-400 text-xs px-1"
                type="button"
              >
                ↓
              </button>
              <button
                onClick={() => setSections(sections.filter((_, i) => i !== idx))}
                className="text-red-500 text-xs px-1"
                type="button"
              >
                ✕
              </button>
            </div>

            {section.type === "text" && (
              <Input
                value={section.placeholder ?? ""}
                placeholder="Placeholder (optional)"
                onChange={(e) => updateSection(idx, { placeholder: e.target.value })}
              />
            )}

            {section.type === "grouped_bullets" && (
              <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                <p className="text-xs text-gray-500">Default groups:</p>
                {section.groups.map((g, gi) => (
                  <div key={gi} className="flex gap-1">
                    <Input
                      value={g.name}
                      placeholder="Group name"
                      onChange={(e) => {
                        const next = [...section.groups];
                        next[gi] = { ...g, name: e.target.value };
                        updateSection(idx, { groups: next });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateSection(idx, {
                          groups: section.groups.filter((_, i) => i !== gi),
                        })
                      }
                      className="text-gray-400 text-xs px-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateSection(idx, {
                      groups: [...section.groups, { name: "", items: [] }],
                    })
                  }
                >
                  + Group
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <Select
          onValueChange={(v) =>
            setSections([...sections, newSection(v as NoteSection["type"])])
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="+ Add section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="bullets">Bullet list</SelectItem>
            <SelectItem value="grouped_bullets">Grouped bullets</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button
          onClick={() => onSave({ name: name.trim(), sections })}
          disabled={saving || !name.trim() || sections.length === 0}
        >
          {saving ? "Saving..." : "Save Template"}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
