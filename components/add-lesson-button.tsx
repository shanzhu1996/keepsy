"use client";

import { useState } from "react";
import AddLessonDialog from "@/components/add-lesson-dialog";

interface AddLessonButtonProps {
  studentId: string;
  studentName: string;
  defaultDuration?: number;
  billingCycleLessons?: number | null;
}

export default function AddLessonButton({
  studentId,
  studentName,
  defaultDuration,
  billingCycleLessons,
}: AddLessonButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
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
