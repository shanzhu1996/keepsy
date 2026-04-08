"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { exportSingleLessonToPDF } from "@/lib/pdf-export";
import type { Lesson } from "@/lib/types";

interface NoteInputProps {
  lessonId: string;
  scheduledAt: string;
  studentName: string;
  existingNote?: string | null;
  existingStudentSummary?: string | null;
  onSaved?: () => void;
  onClose?: () => void;
}

interface Parsed {
  covered: string[];
  teacherNotes: string;
  assignments: string[];
  links: string[];
}

function parseRawNote(raw: string): Parsed {
  const result: Parsed = { covered: [], teacherNotes: "", assignments: [], links: [] };
  if (!raw) return result;
  const lines = raw.split("\n");
  let bucket: "covered" | "notes" | "assignments" | "links" | null = null;
  const notesLines: string[] = [];
  for (const line of lines) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      const title = h[1].toLowerCase();
      if (title.includes("covered")) bucket = "covered";
      else if (title.includes("assignment")) bucket = "assignments";
      else if (title.includes("link")) bucket = "links";
      else if (title.includes("note")) bucket = "notes";
      else bucket = null;
      continue;
    }
    if (!bucket) continue;
    const bullet = line.match(/^-\s+(.+)$/);
    if (bucket === "covered" && bullet) result.covered.push(bullet[1]);
    else if (bucket === "assignments" && bullet) result.assignments.push(bullet[1]);
    else if (bucket === "links" && bullet) result.links.push(bullet[1]);
    else if (bucket === "notes") notesLines.push(line);
  }
  result.teacherNotes = notesLines.join("\n").trim();
  return result;
}

function toMarkdown(
  covered: string[],
  teacherNotes: string,
  assignments: string[],
  links: string[]
): string {
  const parts: string[] = [];
  const c = covered.filter((x) => x.trim());
  const a = assignments.filter((x) => x.trim());
  const l = links.filter((x) => x.trim());

  parts.push("## Covered in this lesson");
  if (c.length) for (const i of c) parts.push(`- ${i}`);
  else parts.push("_(none)_");
  parts.push("");

  parts.push("## Teacher's Notes");
  parts.push(teacherNotes.trim() || "_(none)_");
  parts.push("");

  parts.push("## Assignments");
  if (a.length) for (const i of a) parts.push(`- ${i}`);
  else parts.push("_(none)_");

  if (l.length) {
    parts.push("");
    parts.push("## Links");
    for (const i of l) parts.push(`- ${i}`);
  }
  return parts.join("\n");
}

export default function NoteInput({
  lessonId,
  scheduledAt,
  studentName,
  existingNote,
  existingStudentSummary,
  onSaved,
  onClose,
}: NoteInputProps) {
  const supabase = createClient();
  const parsed = parseRawNote(existingNote ?? "");

  const [brainDump, setBrainDump] = useState("");
  const [covered, setCovered] = useState<string[]>(
    parsed.covered.length ? parsed.covered : [""]
  );
  const [teacherNotes, setTeacherNotes] = useState(parsed.teacherNotes);
  const [assignments, setAssignments] = useState<string[]>(
    parsed.assignments.length ? parsed.assignments : [""]
  );
  const [links, setLinks] = useState<string[]>(
    parsed.links.length ? parsed.links : [""]
  );
  const [studentSummary, setStudentSummary] = useState(existingStudentSummary ?? "");

  const [structuring, setStructuring] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleStructure() {
    if (!brainDump.trim()) return;
    setStructuring(true);
    try {
      const res = await fetch("/api/notes/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, brainDump }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCovered(data.covered?.length ? data.covered : [""]);
      setTeacherNotes(data.teacherNotes ?? "");
      setAssignments(data.assignments?.length ? data.assignments : [""]);
    } catch {
      alert("Failed to organize notes");
    } finally {
      setStructuring(false);
    }
  }

  async function handleGenerate() {
    const rawNote = toMarkdown(covered, teacherNotes, assignments, links);
    if (!rawNote.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, rawNote }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setStudentSummary(data.studentSummary);
    } catch {
      alert("Failed to generate student message");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const rawNote = toMarkdown(covered, teacherNotes, assignments, links);
      const { error } = await supabase
        .from("lessons")
        .update({
          raw_note: rawNote,
          student_summary: studentSummary || null,
        })
        .eq("id", lessonId);
      if (error) throw error;
      onSaved?.();
    } catch {
      alert("Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(
    list: string[],
    setter: (v: string[]) => void,
    idx: number,
    value: string
  ) {
    const next = [...list];
    next[idx] = value;
    setter(next);
  }

  function renderBulletList(
    list: string[],
    setter: (v: string[]) => void,
    placeholder: string
  ) {
    return (
      <div className="space-y-1 mt-1">
        {list.map((item, idx) => (
          <div key={idx} className="flex gap-1">
            <Input
              value={item}
              placeholder={placeholder}
              onChange={(e) => updateItem(list, setter, idx, e.target.value)}
            />
            {list.length > 1 && (
              <button
                type="button"
                onClick={() => setter(list.filter((_, i) => i !== idx))}
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
          onClick={() => setter([...list, ""])}
        >
          + Add
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Brain dump → AI structure */}
      <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
        <label className="text-sm font-semibold text-amber-900">
          Quick brain dump
        </label>
        <p className="text-xs text-amber-700 mb-1">
          Jot anything from the lesson. AI will organize it below.
        </p>
        <Textarea
          value={brainDump}
          onChange={(e) => setBrainDump(e.target.value)}
          placeholder="e.g. worked on scales, struggled with pinky. Reviewed Bach — good progress. Practice slowly with metronome this week."
          rows={3}
        />
        <Button
          onClick={handleStructure}
          disabled={structuring || !brainDump.trim()}
          className="mt-2 w-full"
        >
          {structuring ? "Organizing..." : "✨ Organize with AI"}
        </Button>
      </div>

      <div>
        <label className="text-sm font-semibold">Covered in this lesson</label>
        {renderBulletList(covered, setCovered, "• item")}
      </div>

      <div>
        <label className="text-sm font-semibold">Teacher&apos;s Notes</label>
        <Textarea
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          placeholder="Observations, feedback, things to remember..."
          rows={4}
        />
      </div>

      <div>
        <label className="text-sm font-semibold">Assignments</label>
        {renderBulletList(assignments, setAssignments, "• practice item")}
      </div>

      <div>
        <label className="text-sm font-semibold">
          Links <span className="text-xs text-gray-400 font-normal">(optional)</span>
        </label>
        {renderBulletList(links, setLinks, "https://...")}
      </div>

      <Button
        onClick={handleGenerate}
        disabled={generating}
        variant="outline"
        className="w-full"
      >
        {generating ? "Generating..." : "✨ Draft Message for Student"}
      </Button>

      {studentSummary && (
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-semibold">Student Message</label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(studentSummary);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setStudentSummary("")}
                title="Clear"
              >
                ✕
              </Button>
            </div>
          </div>
          <Textarea
            value={studentSummary}
            onChange={(e) => setStudentSummary(e.target.value)}
            rows={3}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "Saving..." : "Save Notes"}
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          const rawNote = toMarkdown(covered, teacherNotes, assignments, links);
          exportSingleLessonToPDF(studentName, {
            id: lessonId,
            scheduled_at: scheduledAt,
            raw_note: rawNote,
          } as Lesson);
        }}
      >
        📥 Export as PDF
      </Button>
    </div>
  );
}
