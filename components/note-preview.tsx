"use client";

import { useState } from "react";

interface NotePreviewProps {
  note: string;
  maxChars?: number;
}

export default function NotePreview({ note, maxChars = 80 }: NotePreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = note.length > maxChars;

  return (
    <div
      className="text-sm rounded-lg p-2 mt-2 mb-2"
      style={{
        backgroundColor: "var(--bg-surface)",
        color: "var(--ink-secondary)",
      }}
      onClick={(e) => {
        e.preventDefault(); // don't trigger parent <Link>
        if (isLong) setExpanded((v) => !v);
      }}
    >
      <span className="font-medium" style={{ color: "var(--ink-tertiary)" }}>
        notes:{" "}
      </span>
      {expanded || !isLong ? note : note.slice(0, maxChars) + "…"}
      {isLong && (
        <span
          className="ml-1 text-xs cursor-pointer select-none"
          style={{ color: "var(--accent)" }}
        >
          {expanded ? " show less" : " show more"}
        </span>
      )}
    </div>
  );
}
