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
      className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2 mb-2"
      onClick={(e) => {
        e.preventDefault(); // don't trigger parent <Link>
        if (isLong) setExpanded((v) => !v);
      }}
    >
      <span className="font-medium text-gray-600">Notes: </span>
      {expanded || !isLong ? note : note.slice(0, maxChars) + "…"}
      {isLong && (
        <span className="ml-1 text-xs text-amber-600 cursor-pointer select-none">
          {expanded ? " show less" : " show more"}
        </span>
      )}
    </div>
  );
}
