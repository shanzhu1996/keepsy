"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CalendarPicker from "@/components/calendar-picker";
import TimePickerInput from "@/components/time-picker";
import { createClient } from "@/lib/supabase/client";
import type { Lesson, Student } from "@/lib/types";

interface AddLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected student — hides the student picker */
  studentId?: string;
  studentName?: string;
  /** List of students for the picker — shown when studentId is not provided */
  students?: Student[];
  /** All known lessons — powers conflict detection + smart seeding */
  existingLessons?: Lesson[];
  defaultDuration?: number;
  billingCycleLessons?: number | null;
  /** Called after successful creation (e.g. fetchData for Today page) */
  onCreated?: () => void;
}

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextHalfHour(): string {
  const d = new Date();
  const m = d.getMinutes();
  if (m === 0 || m === 30) {
    d.setMinutes(m === 0 ? 30 : 60);
  } else if (m < 30) {
    d.setMinutes(30);
  } else {
    d.setMinutes(60);
  }
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toHHmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const DURATION_OPTIONS = ["30", "45", "60", "90"];
const COUNT_OPTIONS = ["4", "8", "12", "16", "24"];

export default function AddLessonDialog({
  open,
  onOpenChange,
  studentId: fixedStudentId,
  studentName: fixedStudentName,
  students = [],
  existingLessons = [],
  defaultDuration = 60,
  billingCycleLessons,
  onCreated,
}: AddLessonDialogProps) {
  const router = useRouter();
  const supabase = createClient();

  // Student picker state (only used when fixedStudentId is not provided)
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOpen, setStudentOpen] = useState(false);
  const studentWrapRef = useRef<HTMLDivElement>(null);

  // The active student ID — either fixed or picked
  const activeStudentId = fixedStudentId || selectedStudent;
  const activeStudentName =
    fixedStudentName ||
    students.find((s) => s.id === selectedStudent)?.name ||
    "";

  // Form state
  const [date, setDate] = useState(localDateStr());
  const [time, setTime] = useState(() => nextHalfHour());
  const [duration, setDuration] = useState(String(defaultDuration));
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDurationCustom, setShowDurationCustom] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState("weekly");
  const [recurrenceCount, setRecurrenceCount] = useState("8");
  const [showRepeatsCustom, setShowRepeatsCustom] = useState(false);
  const [showCountCustom, setShowCountCustom] = useState(false);
  const [customIntervalDays, setCustomIntervalDays] = useState("21");
  const [saving, setSaving] = useState(false);

  // Smart seeding refs
  const userPickedTimeRef = useRef(false);
  const userPickedDurationRef = useRef(false);

  // Last lesson for selected student — powers "Suggested" prefill
  const [lastLessonForStudent, setLastLessonForStudent] = useState<Lesson | null>(null);

  // Refs for scrolling
  const dateStripRef = useRef<HTMLButtonElement>(null);
  const repeatRef = useRef<HTMLDivElement>(null);

  // Default count from billing cycle
  const defaultCount = billingCycleLessons && billingCycleLessons > 1 ? String(billingCycleLessons) : "8";

  // ── Reset on open/close — only fires when `open` actually changes ──
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog just opened — reset everything
      if (students.length === 1 && !fixedStudentId && !selectedStudent) {
        setSelectedStudent(students[0].id);
      }
      setDate(localDateStr());
      setTime(nextHalfHour());
      setDuration(String(defaultDuration));
      setShowCalendar(false);
      setShowDurationCustom(false);
      setIsRecurring(false);
      setRecurrenceRule("weekly");
      setRecurrenceCount(defaultCount);
      setShowRepeatsCustom(false);
      setShowCountCustom(false);
      setCustomIntervalDays("21");
      userPickedTimeRef.current = false;
      userPickedDurationRef.current = false;
    } else if (!open && prevOpenRef.current) {
      // Dialog just closed
      setStudentQuery("");
      setStudentOpen(false);
    }
    prevOpenRef.current = open;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Smart time seeding ──
  useEffect(() => {
    if (!open || userPickedTimeRef.current) return;

    // 1. Latest lesson on the selected date → back-to-back
    const sameDay = existingLessons
      .filter((l) => localDateStr(new Date(l.scheduled_at)) === date && l.status !== "cancelled")
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    if (sameDay.length > 0) {
      const last = sameDay[sameDay.length - 1];
      const endMs = new Date(last.scheduled_at).getTime() + (last.duration_min ?? 60) * 60_000;
      setTime(toHHmm(new Date(endMs).toISOString()));
      return;
    }

    // 2. Most recent lesson with this student → consistency
    if (activeStudentId) {
      const studentLessons = existingLessons
        .filter((l) => l.student_id === activeStudentId)
        .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
      if (studentLessons.length > 0) {
        setTime(toHHmm(studentLessons[0].scheduled_at));
        return;
      }
    }

    // 3. Fallback
    setTime(nextHalfHour());
  }, [open, date, activeStudentId, existingLessons]);

  // ── Smart duration seeding ──
  useEffect(() => {
    if (!open || userPickedDurationRef.current || !activeStudentId) return;
    const prior = existingLessons
      .filter((l) => l.student_id === activeStudentId)
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    if (prior.length > 0 && prior[0].duration_min) {
      setDuration(String(prior[0].duration_min));
    }
  }, [open, activeStudentId, existingLessons]);

  // ── Fetch last lesson for "Suggested" prefill ──
  useEffect(() => {
    if (!open || !activeStudentId) {
      setLastLessonForStudent(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("student_id", activeStudentId)
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      setLastLessonForStudent(data && data[0] ? (data[0] as Lesson) : null);
    })();
    return () => { cancelled = true; };
  }, [open, activeStudentId, supabase]);

  // ── Center date strip on selection ──
  useEffect(() => {
    if (!open || showCalendar) return;
    requestAnimationFrame(() => {
      dateStripRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    });
  }, [open, date, showCalendar]);

  // ── Click outside to close student dropdown ──
  useEffect(() => {
    if (!studentOpen) return;
    function handle(e: MouseEvent) {
      if (studentWrapRef.current && !studentWrapRef.current.contains(e.target as Node)) {
        setStudentOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [studentOpen]);

  // ── Scroll repeat into view when toggled ──
  useEffect(() => {
    if (isRecurring) {
      requestAnimationFrame(() => {
        repeatRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
  }, [isRecurring]);

  // ── Derived values ──

  // Conflict detection
  const newLessonConflict = (() => {
    if (!date || !time) return null;
    const start = new Date(`${date}T${time}:00`).getTime();
    const end = start + (parseInt(duration) || 60) * 60_000;
    for (const l of existingLessons) {
      if (l.status === "cancelled") continue;
      const lStart = new Date(l.scheduled_at).getTime();
      const lEnd = lStart + (l.duration_min ?? 60) * 60_000;
      if (start < lEnd && end > lStart) return l;
    }
    return null;
  })();

  // Recurring end date label
  const recurringEndLabel = (() => {
    if (!isRecurring || !date || !time) return null;
    const count = parseInt(recurrenceCount) || 0;
    if (count < 2) return null;
    const startDate = new Date(`${date}T${time}:00`);
    const isMonthly = recurrenceRule === "monthly";
    let intervalDays = 7;
    if (recurrenceRule === "biweekly") intervalDays = 14;
    else if (recurrenceRule === "every-3w") intervalDays = 21;
    else if (recurrenceRule.startsWith("custom:")) {
      const n = parseInt(recurrenceRule.split(":")[1], 10);
      if (Number.isFinite(n) && n > 0) intervalDays = n;
    }
    const last = new Date(startDate);
    if (isMonthly) last.setMonth(last.getMonth() + (count - 1));
    else last.setDate(last.getDate() + intervalDays * (count - 1));
    return last.toLocaleDateString([], { month: "short", day: "numeric" });
  })();

  // "Suggested" prefill from last lesson
  const lastLessonPrefill = (() => {
    if (!lastLessonForStudent) return null;
    const last = new Date(lastLessonForStudent.scheduled_at);
    const durMin = lastLessonForStudent.duration_min ?? 60;
    const rule = lastLessonForStudent.recurrence_rule ?? "";
    let intervalDays = 7;
    let isMonthly = false;
    if (rule === "biweekly") intervalDays = 14;
    else if (rule === "every-3w") intervalDays = 21;
    else if (rule === "monthly") isMonthly = true;
    else if (rule.startsWith("custom:")) {
      const n = parseInt(rule.split(":")[1], 10);
      if (Number.isFinite(n) && n > 0) intervalDays = n;
    }
    const next = new Date(last);
    if (isMonthly) next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + intervalDays);

    const nextIso = localDateStr(next);
    const hh = `${String(last.getHours()).padStart(2, "0")}:${String(last.getMinutes()).padStart(2, "0")}`;
    const nextWeekday = next.toLocaleDateString([], { weekday: "short" });
    const nextDayNum = next.getDate();
    const nextMonth = next.toLocaleDateString([], { month: "short" });
    const timeLabel = last.toLocaleTimeString([], {
      hour: "numeric",
      minute: last.getMinutes() === 0 ? undefined : "2-digit",
    }).toLowerCase();
    return { label: `${nextWeekday} ${nextMonth} ${nextDayNum} · ${timeLabel} · ${durMin} min`, nextIso, hh, durMin };
  })();

  function applyLastLessonPrefill() {
    if (!lastLessonPrefill) return;
    setDate(lastLessonPrefill.nextIso);
    setTime(lastLessonPrefill.hh);
    setDuration(String(lastLessonPrefill.durMin));
    userPickedTimeRef.current = true;
    userPickedDurationRef.current = true;
  }


  // ── Submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeStudentId) return;
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const dateTime = new Date(`${date}T${time}:00`).toISOString();

      if (isRecurring) {
        const startDate = new Date(dateTime);
        const groupId = crypto.randomUUID();
        const count = parseInt(recurrenceCount) || 8;
        const rows = [];

        const isMonthly = recurrenceRule === "monthly";
        let intervalDays = 7;
        if (recurrenceRule === "biweekly") intervalDays = 14;
        else if (recurrenceRule === "every-3w") intervalDays = 21;
        else if (recurrenceRule.startsWith("custom:")) {
          const n = parseInt(recurrenceRule.split(":")[1], 10);
          if (Number.isFinite(n) && n > 0) intervalDays = n;
        }

        for (let i = 0; i < count; i++) {
          const d = new Date(startDate);
          if (isMonthly) {
            d.setMonth(d.getMonth() + i);
          } else {
            d.setDate(d.getDate() + intervalDays * i);
          }
          rows.push({
            user_id: user.id,
            student_id: activeStudentId,
            scheduled_at: d.toISOString(),
            duration_min: parseInt(duration) || 60,
            recurrence_rule: recurrenceRule,
            recurrence_group_id: groupId,
          });
        }

        const { error } = await supabase.from("lessons").insert(rows);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lessons").insert({
          user_id: user.id,
          student_id: activeStudentId,
          scheduled_at: dateTime,
          duration_min: parseInt(duration) || 60,
        });
        if (error) throw error;
      }

      onOpenChange(false);
      if (!fixedStudentId) setSelectedStudent("");
      if (onCreated) {
        onCreated();
      } else {
        router.refresh();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create lesson");
    } finally {
      setSaving(false);
    }
  }

  const todayStr = localDateStr();
  const showStudentPicker = !fixedStudentId;
  const selectedStudentObj = students.find((s) => s.id === selectedStudent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
        style={{
          backgroundColor: "var(--bg-canvas)",
          border: "1px solid var(--line-strong)",
          padding: 0,
          gap: 0,
          display: "flex",
          flexDirection: "column",
          maxHeight: "88vh",
          overflow: "hidden",
        }}
      >
        <DialogHeader style={{ padding: "24px 24px 0 24px" }}>
          <DialogTitle
            className="font-display"
            style={{
              fontSize: "24px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "var(--ink-primary)",
            }}
          >
            new lesson
          </DialogTitle>
          {fixedStudentId && fixedStudentName && (
            <p className="text-sm mt-1" style={{ color: "var(--ink-secondary)" }}>
              {fixedStudentName}
            </p>
          )}
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.requestSubmit();
            }
          }}
          className="min-w-0 flex flex-col"
          style={{ flex: "1 1 auto", minHeight: 0 }}
        >
          <div
            className="space-y-5 min-w-0"
            style={{ flex: "1 1 auto", overflowY: "auto", padding: "16px 24px 28px" }}
          >
            {/* ── Student picker (only when no fixed student) ── */}
            {showStudentPicker && (
              <div>
                <label
                  className="block mb-2"
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--ink-secondary)",
                    textTransform: "lowercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  student
                </label>
                {(() => {
                  const showSearch = students.length > 8;
                  const q = studentQuery.trim().toLowerCase();
                  const filtered = q
                    ? students.filter((s) => s.name.toLowerCase().includes(q))
                    : students;

                  return (
                    <div className="relative" ref={studentWrapRef}>
                      <button
                        type="button"
                        onClick={() => {
                          if (students.length === 0) return;
                          setStudentOpen((s) => !s);
                        }}
                        disabled={students.length === 0}
                        className="w-full flex items-center justify-between transition-colors"
                        style={{
                          backgroundColor: "var(--bg-surface)",
                          border: studentOpen
                            ? "1px solid var(--accent)"
                            : "1px solid var(--line-strong)",
                          borderRadius: "12px",
                          padding: "10px 14px",
                          height: "44px",
                          fontSize: "15px",
                          color: selectedStudentObj ? "var(--ink-primary)" : "var(--ink-tertiary)",
                          cursor: students.length === 0 ? "not-allowed" : "pointer",
                          textAlign: "left",
                          transition: "border-color 120ms ease",
                        }}
                      >
                        <span style={{ fontWeight: selectedStudentObj ? 500 : 400 }}>
                          {students.length === 0
                            ? "no students yet — add one first"
                            : selectedStudentObj
                            ? selectedStudentObj.name
                            : "pick a student"}
                        </span>
                        {selectedStudentObj ? (
                          <span
                            role="button"
                            aria-label="Clear student"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudent("");
                              setStudentQuery("");
                              setStudentOpen(false);
                            }}
                            className="flex items-center justify-center"
                            style={{
                              color: "var(--ink-tertiary)",
                              fontSize: "18px",
                              fontWeight: 400,
                              lineHeight: 1,
                              width: "32px",
                              height: "32px",
                              marginRight: "-8px",
                              borderRadius: "999px",
                            }}
                          >
                            ×
                          </span>
                        ) : (
                          <span
                            aria-hidden
                            style={{
                              color: "var(--ink-tertiary)",
                              fontSize: "14px",
                              lineHeight: 1,
                              display: "inline-block",
                              transform: studentOpen ? "rotate(180deg)" : "none",
                              transition: "transform 160ms ease",
                            }}
                          >
                            ⌄
                          </span>
                        )}
                      </button>

                      {students.length === 0 && (
                        <a
                          href="/students/new"
                          className="text-[12px] mt-1.5 ml-1 inline-block"
                          style={{ color: "var(--accent)" }}
                        >
                          + add your first student
                        </a>
                      )}

                      {studentOpen && students.length > 0 && (
                        <div
                          className="absolute z-20 w-full overflow-hidden"
                          style={{
                            marginTop: "6px",
                            backgroundColor: "var(--bg-surface)",
                            border: "1px solid var(--line-strong)",
                            borderRadius: "12px",
                            boxShadow: "0 8px 24px rgba(43, 31, 23, 0.08)",
                          }}
                        >
                          {showSearch && (
                            <input
                              type="text"
                              autoFocus
                              value={studentQuery}
                              onChange={(e) => setStudentQuery(e.target.value)}
                              placeholder="search…"
                              className="w-full focus:outline-none placeholder:text-[var(--ink-tertiary)]"
                              style={{
                                padding: "10px 14px",
                                fontSize: "14px",
                                border: "none",
                                borderBottom: "1px solid var(--line-subtle)",
                                backgroundColor: "transparent",
                                color: "var(--ink-primary)",
                              }}
                            />
                          )}
                          <ul className="overflow-auto" style={{ maxHeight: "260px" }}>
                            {filtered.map((s) => {
                              const isSel = s.id === selectedStudent;
                              return (
                                <li key={s.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStudent(s.id);
                                      setStudentOpen(false);
                                      setStudentQuery("");
                                    }}
                                    className="w-full text-left flex items-center justify-between transition-colors hover:bg-[var(--bg-canvas)]"
                                    style={{
                                      padding: "12px 14px",
                                      minHeight: "44px",
                                      fontSize: "14px",
                                      color: isSel ? "var(--accent-ink)" : "var(--ink-primary)",
                                      backgroundColor: isSel ? "var(--accent-soft)" : "transparent",
                                      border: "none",
                                      cursor: "pointer",
                                      fontWeight: isSel ? 500 : 400,
                                    }}
                                  >
                                    <span>{s.name}</span>
                                    {isSel && (
                                      <span style={{ color: "var(--accent-ink)", fontSize: "14px" }}>✓</span>
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                            {filtered.length === 0 && (
                              <li style={{ padding: "12px 14px", fontSize: "13px", color: "var(--ink-tertiary)" }}>
                                no matches
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Suggested prefill */}
                {lastLessonPrefill && (() => {
                  const applied =
                    date === lastLessonPrefill.nextIso &&
                    time === lastLessonPrefill.hh &&
                    duration === String(lastLessonPrefill.durMin);
                  if (applied) return null;
                  return (
                    <div
                      className="flex items-baseline justify-between gap-3"
                      style={{ marginTop: "14px", marginBottom: "4px", paddingLeft: "2px", paddingRight: "2px" }}
                    >
                      <div className="flex items-baseline gap-2 min-w-0" style={{ fontSize: "13px" }}>
                        <span style={{ color: "var(--ink-tertiary)", fontWeight: 500, textTransform: "lowercase", letterSpacing: "0.02em" }}>
                          suggested:
                        </span>
                        <span className="truncate" style={{ color: "var(--ink-secondary)", fontWeight: 400 }}>
                          {lastLessonPrefill.label}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={applyLastLessonPrefill}
                        className="transition-colors"
                        style={{
                          flexShrink: 0,
                          background: "transparent",
                          border: "none",
                          padding: "2px 4px",
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--accent-cool, #3d5a4a)",
                          textDecoration: "underline",
                          textUnderlineOffset: "3px",
                          textDecorationColor: "rgba(61, 90, 74, 0.4)",
                        }}
                      >
                        accept
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── When — date strip + time ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--ink-secondary)",
                      textTransform: "lowercase",
                      letterSpacing: "0.02em",
                    }}
                  >
                    when
                  </label>
                  <span
                    className="font-display"
                    style={{ fontSize: "13px", fontStyle: "italic", color: "var(--ink-tertiary)" }}
                  >
                    {new Date(date + "T12:00:00").toLocaleDateString([], {
                      month: "long",
                      year: new Date(date + "T12:00:00").getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCalendar((s) => !s)}
                  className="transition-colors"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    border: showCalendar ? "1px solid var(--accent)" : "1px solid transparent",
                    backgroundColor: showCalendar ? "var(--accent-soft)" : "transparent",
                    color: showCalendar ? "var(--accent-ink)" : "var(--ink-tertiary)",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {showCalendar ? "close" : "calendar"}
                </button>
              </div>

              {!showCalendar && (
                <div className="relative">
                  <div
                    className="flex gap-2 overflow-x-auto pb-1"
                    style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
                  >
                    {Array.from({ length: 15 }, (_, i) => {
                      const sel = new Date(date + "T12:00:00");
                      sel.setHours(0, 0, 0, 0);
                      const d = new Date(sel);
                      d.setDate(d.getDate() + (i - 7));
                      const iso = localDateStr(d);
                      const isSelected = iso === date;
                      const isToday = iso === todayStr;
                      return (
                        <button
                          key={iso}
                          ref={isSelected ? dateStripRef : undefined}
                          type="button"
                          onClick={() => setDate(iso)}
                          className="flex flex-col items-center justify-center transition-colors"
                          style={{
                            flex: "0 0 auto",
                            width: "52px",
                            height: "64px",
                            borderRadius: "12px",
                            border: isSelected || isToday ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
                            backgroundColor: isSelected ? "var(--accent-soft)" : "var(--bg-surface)",
                            color: isSelected || isToday ? "var(--accent-ink)" : "var(--ink-primary)",
                            gap: "2px",
                          }}
                        >
                          <span style={{ fontSize: "10px", fontWeight: 500, textTransform: "lowercase", letterSpacing: "0.04em", opacity: isSelected ? 0.7 : 0.55 }}>
                            {d.toLocaleDateString([], { weekday: "short" }).toLowerCase()}
                          </span>
                          <span className="font-display-numerals" style={{ fontSize: "20px", fontWeight: 500, lineHeight: 1 }}>
                            {d.getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    aria-hidden
                    style={{
                      position: "absolute", top: 0, right: 0, bottom: 0, width: "32px",
                      pointerEvents: "none",
                      background: "linear-gradient(to right, rgba(244, 237, 224, 0) 0%, var(--bg-canvas) 100%)",
                    }}
                  />
                </div>
              )}

              {showCalendar && (
                <div className="mt-2">
                  <CalendarPicker
                    value={date}
                    onChange={(d) => { setDate(d); setShowCalendar(false); }}
                    compact
                  />
                </div>
              )}

              <div
                className="font-display"
                style={{ marginTop: "10px", marginBottom: "4px", marginLeft: "2px", fontSize: "13px", fontStyle: "italic", color: "var(--ink-tertiary)" }}
              >
                at
              </div>
              <TimePickerInput
                key={open ? "open" : "closed"}
                value={time}
                onChange={(t) => {
                  userPickedTimeRef.current = true;
                  setTime(t);
                }}
              />
              {newLessonConflict && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "var(--accent-cool, #3d5a4a)",
                    opacity: 0.85,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "14px", lineHeight: 1 }}>◆</span>
                  <span>
                    overlaps with {newLessonConflict.student?.name ?? "another lesson"} ·{" "}
                    {new Date(newLessonConflict.scheduled_at)
                      .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                      .toLowerCase()}
                  </span>
                </div>
              )}
            </div>

            {/* ── Duration ── */}
            <div>
              <label
                className="block mb-2"
                style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink-secondary)", textTransform: "lowercase", letterSpacing: "0.02em" }}
              >
                duration
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_OPTIONS.map((d) => {
                  const isPresetActive = DURATION_OPTIONS.includes(duration);
                  const selected = d === duration && isPresetActive;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        userPickedDurationRef.current = true;
                        setDuration(d);
                        setShowDurationCustom(false);
                      }}
                      className="transition-colors"
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: 500,
                        border: selected ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
                        backgroundColor: selected ? "var(--accent-soft)" : "var(--bg-surface)",
                        color: selected ? "var(--accent-ink)" : "var(--ink-primary)",
                      }}
                    >
                      {d} min
                    </button>
                  );
                })}
                {(() => {
                  const customActive = showDurationCustom || !DURATION_OPTIONS.includes(duration);
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        userPickedDurationRef.current = true;
                        setShowDurationCustom((s) => {
                          const next = !s;
                          if (next && DURATION_OPTIONS.includes(duration)) setDuration("20");
                          return next;
                        });
                      }}
                      className="transition-colors"
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 500,
                        border: customActive ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
                        backgroundColor: customActive ? "var(--accent-soft)" : "var(--bg-surface)",
                        color: customActive ? "var(--accent-ink)" : "var(--ink-secondary)",
                      }}
                    >
                      other
                    </button>
                  );
                })()}
              </div>
              {(showDurationCustom || !DURATION_OPTIONS.includes(duration)) && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="240"
                    step="5"
                    value={duration}
                    onChange={(e) => {
                      userPickedDurationRef.current = true;
                      setDuration(e.target.value);
                    }}
                    className="font-display-numerals"
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      width: "80px",
                      border: "1px solid var(--line-strong)",
                      backgroundColor: "var(--bg-canvas)",
                      color: "var(--ink-primary)",
                      outline: "none",
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>minutes</span>
                </div>
              )}
            </div>

            {/* ── Repeat ── */}
            <div ref={repeatRef} style={{ marginTop: "8px" }}>
              {!isRecurring ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsRecurring(true);
                    setRecurrenceRule("weekly");
                    setRecurrenceCount(defaultCount);
                  }}
                  className="transition-colors"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 2px",
                    background: "transparent",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--ink-secondary)",
                    letterSpacing: "0.01em",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span>
                  make it recurring
                </button>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      style={{ fontSize: "12px", fontWeight: 500, color: "var(--ink-secondary)", textTransform: "lowercase", letterSpacing: "0.02em" }}
                    >
                      repeat
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecurring(false);
                        setShowRepeatsCustom(false);
                        setShowCountCustom(false);
                      }}
                      className="transition-colors"
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: "12px",
                        color: "var(--ink-tertiary)",
                        padding: "2px 4px",
                        cursor: "pointer",
                      }}
                    >
                      – just one lesson
                    </button>
                  </div>

                 <div style={{ paddingLeft: "12px", borderLeft: "2px solid var(--line-subtle)" }}>
                  {/* Frequency chips */}
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: "weekly", label: "weekly" },
                      { id: "biweekly", label: "biweekly" },
                      { id: "monthly", label: "monthly" },
                    ].map((opt) => {
                      const selected = recurrenceRule === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              setIsRecurring(false);
                            } else {
                              setRecurrenceRule(opt.id);
                            }
                            setShowRepeatsCustom(false);
                          }}
                          className="transition-colors"
                          style={{
                            padding: "8px 16px",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: 500,
                            border: selected ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
                            backgroundColor: selected ? "var(--accent-soft)" : "var(--bg-surface)",
                            color: selected ? "var(--accent-ink)" : "var(--ink-primary)",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                    {(() => {
                      const customActive = showRepeatsCustom || recurrenceRule.startsWith("custom:");
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setShowRepeatsCustom((s) => {
                              const next = !s;
                              if (next) {
                                setRecurrenceRule(`custom:${customIntervalDays}`);
                              }
                              return next;
                            });
                          }}
                          className="transition-colors"
                          style={{
                            padding: "8px 14px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: 500,
                            border: customActive ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
                            backgroundColor: customActive ? "var(--accent-soft)" : "var(--bg-surface)",
                            color: customActive ? "var(--accent-ink)" : "var(--ink-secondary)",
                          }}
                        >
                          other
                        </button>
                      );
                    })()}
                  </div>

                  {/* Custom interval input */}
                  {(showRepeatsCustom || recurrenceRule.startsWith("custom:")) && (
                    <div className="mt-2 flex items-center gap-1">
                      <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>every</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={customIntervalDays}
                        onChange={(e) => {
                          setCustomIntervalDays(e.target.value);
                          setRecurrenceRule(`custom:${e.target.value}`);
                        }}
                        className="font-display-numerals"
                        style={{
                          padding: "4px 8px",
                          borderRadius: "8px",
                          fontSize: "13px",
                          width: "56px",
                          border: "1px solid var(--accent)",
                          backgroundColor: "var(--bg-canvas)",
                          color: "var(--ink-primary)",
                          outline: "none",
                        }}
                      />
                      <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>days</span>
                    </div>
                  )}

                  {/* Count chips */}
                  <div className="mt-3">
                    <label
                      className="block mb-2"
                      style={{ fontSize: "11px", fontWeight: 500, color: "var(--ink-tertiary)", textTransform: "lowercase", letterSpacing: "0.02em" }}
                    >
                      how many
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {COUNT_OPTIONS.map((n) => {
                        const isPresetCount = COUNT_OPTIONS.includes(recurrenceCount);
                        const selected = n === recurrenceCount && isPresetCount;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              setRecurrenceCount(n);
                              setShowCountCustom(false);
                            }}
                            className="transition-colors"
                            style={{
                              padding: "8px 14px",
                              borderRadius: "10px",
                              fontSize: "14px",
                              fontWeight: 500,
                              border: selected ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
                              backgroundColor: selected ? "var(--accent-soft)" : "var(--bg-surface)",
                              color: selected ? "var(--accent-ink)" : "var(--ink-primary)",
                            }}
                          >
                            {n}
                          </button>
                        );
                      })}
                      {(() => {
                        const customActive = showCountCustom || !COUNT_OPTIONS.includes(recurrenceCount);
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setShowCountCustom((s) => {
                                const next = !s;
                                if (next && COUNT_OPTIONS.includes(recurrenceCount)) setRecurrenceCount("10");
                                return next;
                              });
                            }}
                            className="transition-colors"
                            style={{
                              padding: "8px 14px",
                              borderRadius: "10px",
                              fontSize: "13px",
                              fontWeight: 500,
                              border: customActive ? "1px solid var(--accent)" : "1px solid var(--line-strong)",
                              backgroundColor: customActive ? "var(--accent-soft)" : "var(--bg-surface)",
                              color: customActive ? "var(--accent-ink)" : "var(--ink-secondary)",
                            }}
                          >
                            other
                          </button>
                        );
                      })()}
                    </div>
                    {(showCountCustom || !COUNT_OPTIONS.includes(recurrenceCount)) && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min="2"
                          max="52"
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(e.target.value)}
                          className="font-display-numerals"
                          style={{
                            padding: "6px 10px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            width: "80px",
                            border: "1px solid var(--line-strong)",
                            backgroundColor: "var(--bg-canvas)",
                            color: "var(--ink-primary)",
                            outline: "none",
                          }}
                        />
                        <span style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>lessons</span>
                      </div>
                    )}
                  </div>
                 </div>

                </div>
              )}
            </div>
          </div>

          {/* ── Sticky footer ── */}
          <div
            style={{
              flex: "0 0 auto",
              padding: "14px 24px 20px",
              borderTop: "1px solid var(--line-strong)",
              boxShadow: "0 -6px 12px -8px rgba(43,31,23,0.10)",
              backgroundColor: "var(--bg-canvas)",
            }}
          >
            <button
              type="submit"
              disabled={saving || !activeStudentId || !date || !time}
              className="w-full transition-colors"
              style={{
                minHeight: "52px",
                padding: "8px 16px",
                borderRadius: "12px",
                backgroundColor: "var(--accent)",
                color: "#FFFFFF",
                fontWeight: 500,
                letterSpacing: "-0.005em",
                border: "none",
                opacity: saving || !activeStudentId || !date || !time ? 0.4 : 1,
                cursor: saving || !activeStudentId || !date || !time ? "not-allowed" : "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "2px",
                lineHeight: 1.2,
              }}
            >
              <span style={{ fontSize: "16px" }}>
                {saving
                  ? "creating…"
                  : isRecurring
                  ? `create ${recurrenceCount} lessons`
                  : "create lesson"}
              </span>
              {!saving && isRecurring && recurringEndLabel && (
                <span style={{ fontSize: "12px", fontWeight: 400, opacity: 0.75 }}>
                  ends {recurringEndLabel}
                </span>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
