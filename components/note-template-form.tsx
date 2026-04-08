"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  renderTemplateToMarkdown,
  type NoteTemplate,
  type FilledValues,
} from "@/lib/note-templates";

interface Props {
  template: NoteTemplate;
  onMarkdownChange: (md: string) => void;
}

function initialValues(template: NoteTemplate): FilledValues {
  const v: FilledValues = {};
  for (const s of template.sections) {
    if (s.type === "text") v[s.id] = "";
    else if (s.type === "bullets") v[s.id] = s.items.length ? [...s.items] : [""];
    else
      v[s.id] = s.groups.map((g) => ({
        name: g.name,
        items: g.items.length ? [...g.items] : [""],
      }));
  }
  return v;
}

export default function NoteTemplateForm({ template, onMarkdownChange }: Props) {
  const [values, setValues] = useState<FilledValues>(() => initialValues(template));

  // Reset when template changes
  useEffect(() => {
    const v = initialValues(template);
    setValues(v);
    onMarkdownChange(renderTemplateToMarkdown(template, v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  function update(next: FilledValues) {
    setValues(next);
    onMarkdownChange(renderTemplateToMarkdown(template, next));
  }

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
      {template.sections.map((section) => {
        if (section.type === "text") {
          const val = (values[section.id] as string) ?? "";
          return (
            <div key={section.id}>
              <label className="text-sm font-semibold text-gray-800">
                {section.title}
              </label>
              <Textarea
                value={val}
                placeholder={section.placeholder}
                rows={3}
                onChange={(e) => update({ ...values, [section.id]: e.target.value })}
              />
            </div>
          );
        }

        if (section.type === "bullets") {
          const items = (values[section.id] as string[]) ?? [""];
          return (
            <div key={section.id}>
              <label className="text-sm font-semibold text-gray-800">
                {section.title}
              </label>
              <div className="space-y-1 mt-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-1">
                    <Input
                      value={item}
                      placeholder="• item"
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = e.target.value;
                        update({ ...values, [section.id]: next });
                      }}
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          update({
                            ...values,
                            [section.id]: items.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-gray-400 text-xs px-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => update({ ...values, [section.id]: [...items, ""] })}
                >
                  + Add
                </Button>
              </div>
            </div>
          );
        }

        // grouped_bullets
        const groups =
          (values[section.id] as { name: string; items: string[] }[]) ?? [];
        return (
          <div key={section.id}>
            <label className="text-sm font-semibold text-gray-800">
              {section.title}
            </label>
            <div className="space-y-3 mt-1">
              {groups.map((group, gi) => (
                <div key={gi} className="border-l-2 border-gray-200 pl-3">
                  <Input
                    value={group.name}
                    placeholder="Group name"
                    className="font-medium mb-1"
                    onChange={(e) => {
                      const next = [...groups];
                      next[gi] = { ...group, name: e.target.value };
                      update({ ...values, [section.id]: next });
                    }}
                  />
                  <div className="space-y-1">
                    {group.items.map((item, ii) => (
                      <div key={ii} className="flex gap-1">
                        <Input
                          value={item}
                          placeholder="• item"
                          onChange={(e) => {
                            const next = [...groups];
                            const items = [...group.items];
                            items[ii] = e.target.value;
                            next[gi] = { ...group, items };
                            update({ ...values, [section.id]: next });
                          }}
                        />
                        {group.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...groups];
                              next[gi] = {
                                ...group,
                                items: group.items.filter((_, i) => i !== ii),
                              };
                              update({ ...values, [section.id]: next });
                            }}
                            className="text-gray-400 text-xs px-2"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const next = [...groups];
                        next[gi] = { ...group, items: [...group.items, ""] };
                        update({ ...values, [section.id]: next });
                      }}
                    >
                      + Item
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
