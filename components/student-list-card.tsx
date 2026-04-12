"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StudentListCardProps {
  student: {
    id: string;
    name: string;
    billing_enabled: boolean;
    billing_cycle_lessons: number | null;
    lessons_since_last_payment: number;
    cycle_lessons_offset?: number;
  };
  nextLessonLabel?: string;
  needsPayment: boolean;
  completedCount: number;
}

export default function StudentListCard({
  student,
  nextLessonLabel,
  needsPayment,
  completedCount,
}: StudentListCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: student.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: menuOpen || showDeleteDialog ? 30 : isDragging ? 20 : 1,
  };

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/students/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.id }),
      });
      if (!res.ok) throw new Error("Failed");
      setShowDeleteDialog(false);
      router.refresh();
    } catch {
      alert("Failed to remove student");
    } finally {
      setDeleting(false);
    }
  }

  function getInitials(name: string) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 1).toUpperCase();
  }

  return (
    <>
      <div ref={setNodeRef} style={style} className="relative group" {...attributes}>
        <div
          className="rounded-xl px-4 py-3 transition-shadow duration-150"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: `1px solid ${needsPayment ? "var(--accent)" : "var(--line-strong)"}`,
            borderLeftWidth: needsPayment ? "3px" : "1px",
            boxShadow: isDragging
              ? "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)"
              : "0 1px 3px rgba(0,0,0,0.04), 0 3px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* Drag handle — visible on hover */}
            <button
              ref={setActivatorNodeRef}
              {...listeners}
              className="flex-shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity"
              style={{
                width: "12px",
                marginLeft: "-4px",
                marginRight: "-4px",
                color: "var(--ink-tertiary)",
                outline: "none",
                border: "none",
                background: "none",
                padding: 0,
                touchAction: "none",
              }}
              aria-label="Drag to reorder"
              tabIndex={-1}
            >
              <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor">
                <circle cx="2" cy="2" r="1.2" />
                <circle cx="6" cy="2" r="1.2" />
                <circle cx="2" cy="7" r="1.2" />
                <circle cx="6" cy="7" r="1.2" />
                <circle cx="2" cy="12" r="1.2" />
                <circle cx="6" cy="12" r="1.2" />
              </svg>
            </button>

            {/* Monogram */}
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full font-display font-semibold select-none"
              style={{
                width: "32px",
                height: "32px",
                fontSize: "13px",
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent-ink)",
              }}
            >
              {getInitials(student.name)}
            </div>

            {/* Content — navigates on click */}
            <div
              className="flex-1 min-w-0 cursor-pointer"
              onClick={() => router.push(`/students/${student.id}`)}
            >
              <div className="flex justify-between items-center">
                <h3
                  className="font-semibold text-[15px] leading-tight"
                  style={{ color: "var(--ink-primary)" }}
                >
                  {student.name}
                </h3>

                {needsPayment && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "var(--accent-soft)",
                      color: "var(--accent-ink)",
                    }}
                  >
                    payment due
                  </span>
                )}
              </div>

              {nextLessonLabel && (
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-secondary)" }}>
                  next: {nextLessonLabel}
                </p>
              )}

              {student.billing_enabled && student.billing_cycle_lessons && (() => {
                const offset = student.cycle_lessons_offset ?? 0;
                const total = completedCount + offset;
                const cycleProgress = total % student.billing_cycle_lessons;
                return (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1">
                      {Array.from(
                        { length: student.billing_cycle_lessons },
                        (_, i) => (
                          <span
                            key={i}
                            className="rounded-full"
                            style={{
                              width: "7px",
                              height: "7px",
                              backgroundColor:
                                i < cycleProgress
                                  ? "var(--accent)"
                                  : "var(--line-strong)",
                            }}
                          />
                        )
                      )}
                    </div>
                    <span className="text-xs" style={{ color: "var(--ink-tertiary)" }}>
                      {cycleProgress} of{" "}
                      {student.billing_cycle_lessons} lessons
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Overflow menu */}
            <div className="flex-shrink-0 relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="flex items-center justify-center rounded-full transition-all opacity-0 group-hover:opacity-60 hover:!opacity-100"
                style={{
                  width: "28px",
                  height: "28px",
                  color: "var(--ink-secondary)",
                }}
                aria-label="Student options"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-8 z-20 rounded-xl py-1 min-w-[140px]"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--line-strong)",
                    boxShadow: "var(--shadow-popover)",
                  }}
                >
                  <Link
                    href={`/students/${student.id}/edit`}
                    className="block px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-muted)]"
                    style={{ color: "var(--ink-primary)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    edit
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      setShowDeleteDialog(true);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-muted)]"
                    style={{ color: "var(--danger)" }}
                  >
                    remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-xs" style={{ padding: 0, gap: 0 }}>
          <div style={{ padding: "20px 24px 16px" }}>
            <DialogHeader>
              <DialogTitle
                className="font-display text-xl"
                style={{ color: "var(--ink-primary)" }}
              >
                remove student
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm mt-3" style={{ color: "var(--ink-secondary)" }}>
              this will hide <span className="font-semibold">{student.name}</span> from
              your student list. their lesson history and notes will be preserved.
            </p>
          </div>
          <div
            style={{
              padding: "14px 24px 20px",
              borderTop: "1px solid var(--line-strong)",
              backgroundColor: "var(--bg-canvas)",
            }}
          >
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="text-sm"
                style={{ color: "var(--ink-tertiary)" }}
              >
                cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  color: "var(--danger)",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                {deleting ? "removing…" : "remove student"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
