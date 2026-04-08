"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import TemplateEditor from "@/components/template-editor";
import {
  listTemplatesClient,
  createTemplateClient,
  updateTemplateClient,
  deleteTemplateClient,
  validateTemplateInput,
  type NoteTemplate,
  type NoteTemplateInput,
} from "@/lib/note-templates";
import { DEFAULT_TEMPLATES } from "@/lib/default-templates";

export default function TemplatesManager() {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<
    | { mode: "create"; initial: NoteTemplateInput }
    | { mode: "edit"; id: string; initial: NoteTemplateInput }
    | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  async function load() {
    setLoading(true);
    try {
      setTemplates(await listTemplatesClient());
    } catch (e) {
      alert(`Failed to load templates: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(input: NoteTemplateInput) {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.mode === "create") await createTemplateClient(input);
      else await updateTemplateClient(editing.id, input);
      setEditing(null);
      await load();
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await deleteTemplateClient(id);
      await load();
    } catch (e) {
      alert(`Delete failed: ${(e as Error).message}`);
    }
  }

  async function handleClone(t: NoteTemplateInput) {
    try {
      await createTemplateClient(t);
      await load();
    } catch (e) {
      alert(`Clone failed: ${(e as Error).message}`);
    }
  }

  function handleCopyJson(t: NoteTemplate) {
    const payload = { name: t.name, sections: t.sections };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    alert("Template JSON copied to clipboard");
  }

  async function handleImport() {
    try {
      const parsed = JSON.parse(importText);
      const validated = validateTemplateInput(parsed);
      await createTemplateClient(validated);
      setImportOpen(false);
      setImportText("");
      await load();
    } catch (e) {
      alert(`Import failed: ${(e as Error).message}`);
    }
  }

  if (editing) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-3">
          {editing.mode === "create" ? "New Template" : "Edit Template"}
        </h2>
        <TemplateEditor
          initial={editing.initial}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settings" className="text-sm text-gray-500 hover:underline">
          ← Back to Settings
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Note Templates</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Import JSON
          </Button>
          <Button
            onClick={() =>
              setEditing({
                mode: "create",
                initial: { name: "Untitled", sections: [] },
              })
            }
          >
            + New
          </Button>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Your Templates</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-gray-500">
            No templates yet. Create one or clone a starter below.
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="border rounded-lg p-3 flex justify-between items-start bg-white"
              >
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.sections.length} section{t.sections.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyJson(t)}
                  >
                    Copy JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditing({
                        mode: "edit",
                        id: t.id,
                        initial: { name: t.name, sections: t.sections },
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(t.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Starter Templates</h2>
        <div className="space-y-2">
          {DEFAULT_TEMPLATES.map((t) => (
            <div
              key={t.name}
              className="border rounded-lg p-3 flex justify-between items-start bg-amber-50 border-amber-200"
            >
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-gray-600">
                  {t.sections.map((s) => s.title).join(" · ")}
                </p>
              </div>
              <Button size="sm" onClick={() => handleClone(t)}>
                Use this
              </Button>
            </div>
          ))}
        </div>
      </section>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Template JSON</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={10}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{"name": "...", "sections": [...]}'
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importText.trim()}>
              Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
