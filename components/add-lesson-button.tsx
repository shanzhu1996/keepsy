"use client";

import { useState } from "react";
import AddLessonDialog from "@/components/add-lesson-dialog";

interface AddLessonButtonProps {
  studentId: string;
  studentName: string;
  defaultDuration?: number;
  billingCycleLessons?: number | null;
  variant?: "default" | "compact";
}

export default function AddLessonButton({
  studentId,
  studentName,
  defaultDuration,
  billingCycleLessons,
  variant = "default",
}: AddLessonButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "compact" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] transition-colors"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            border: "1px solid var(--accent)",
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent-ink)",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "14px" }}>📝</span>
          + lesson
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-medium"
          style={{
            color: "var(--accent)",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          + lesson
        </button>
      )}
      <AddLessonDialog
        open={open}
        onOpenChange={setOpen}
        studentId={studentId}
        studentName={studentName}
        defaultDuration={defaultDuration}
        billingCycleLessons={billingCycleLessons}
      />
    </>
  );
}
