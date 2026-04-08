"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SummaryPanelProps {
  internalSummary: string;
  studentSummary: string;
  onInternalChange: (value: string) => void;
  onStudentChange: (value: string) => void;
}

export default function SummaryPanel({
  internalSummary,
  studentSummary,
  onInternalChange,
  onStudentChange,
}: SummaryPanelProps) {
  const [copied, setCopied] = useState<"internal" | "student" | null>(null);

  function handleCopy(text: string, type: "internal" | "student") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium">
            Internal Summary (for you)
          </label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCopy(internalSummary, "internal")}
          >
            {copied === "internal" ? "Copied!" : "Copy"}
          </Button>
        </div>
        <Textarea
          value={internalSummary}
          onChange={(e) => onInternalChange(e.target.value)}
          rows={3}
        />
      </div>

      <Separator />

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium">
            Student Summary (to share)
          </label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleCopy(studentSummary, "student")}
          >
            {copied === "student" ? "Copied!" : "Copy"}
          </Button>
        </div>
        <Textarea
          value={studentSummary}
          onChange={(e) => onStudentChange(e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
}
