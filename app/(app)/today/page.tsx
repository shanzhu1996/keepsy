"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LessonCard from "@/components/lesson-card";
import CalendarPicker from "@/components/calendar-picker";
import TimePickerInput from "@/components/time-picker";
import type { Lesson, Student } from "@/lib/types";

/** Return "YYYY-MM-DD" for the LOCAL date of a Date object. Avoids the UTC
 *  drift from `toISOString().split("T")[0]` that shifts "today" forward at
 *  evening hours in western timezones. */
function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TodayPage() {
  const supabase = createClient();
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [loading, setLoading] = useState(true);   // only true on first load
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    localDateStr()
  );
  const [showFinished, setShowFinished] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "calendar">("today");
  const [scheduleViewYear, setScheduleViewYear] = useState(() => new Date().getFullYear());
  const [scheduleViewMonth, setScheduleViewMonth] = useState(() => new Date().getMonth());

  // Round current time up to the next half-hour, e.g. 2:47pm → 3:00pm.
  // This is the most likely "next free slot" a teacher is scheduling into.
  const nextHalfHour = () => {
    const d = new Date();
    const m = d.getMinutes();
    if (m === 0 || m === 30) {
      // already on the half — bump to NEXT half so we don't suggest "now"
      d.setMinutes(m === 0 ? 30 : 60);
    } else if (m < 30) {
      d.setMinutes(30);
    } else {
      d.setMinutes(60);
    }
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // New lesson form state
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOpen, setStudentOpen] = useState(false);
  const studentWrapRef = useRef<HTMLDivElement>(null);
  const dateStripSelectedRef = useRef<HTMLButtonElement>(null);
  // Tracks whether the user has manually picked a time. Once true, we stop
  // overwriting `time` when date/student changes (smart seeding only fires
  // before the user has expressed an intent).
  const userPickedTimeRef = useRef(false);
  const userPickedDurationRef = useRef(false);
  // Date strip vs full calendar in the new-lesson dialog
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  // Long-tail "Custom..." reveals
  const [showDurationCustom, setShowDurationCustom] = useState(false);
  const [showRepeatsCustom, setShowRepeatsCustom] = useState(false);
  const [showCountCustom, setShowCountCustom] = useState(false);
  const [customIntervalDays, setCustomIntervalDays] = useState("21");
  // Most recent PAST lesson for the selected student — powers the
  // "Same as last" prefill chip. Only fetched once per student.
  const [lastLessonForStudent, setLastLessonForStudent] = useState<Lesson | null>(null);
  const [date, setDate] = useState<string>(
    localDateStr()
  );
  const [time, setTime] = useState<string>(() => nextHalfHour());
  const [duration, setDuration] = useState("60");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState("weekly");
  const [recurrenceCount, setRecurrenceCount] = useState("8");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    const [upcomingRes, studentsRes] = await Promise.all([
      supabase
        .from("lessons")
        .select("*, student:students(*)")
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("students")
        .select("*")
        .eq("is_active", true)
        .order("name"),
    ]);

    setUpcomingLessons(upcomingRes.data ?? []);
    setStudents(studentsRes.data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When the dialog opens, pre-select the only student if there is exactly one,
  // refresh the default time, and focus the student combobox so the user can
  // start typing immediately.
  useEffect(() => {
    if (showNewLesson) {
      if (students.length === 1 && !selectedStudent) {
        setSelectedStudent(students[0].id);
      }
      setTime((prev) => prev || nextHalfHour());
    } else {
      // Full reset on close so reopening always starts from a clean slate
      setStudentQuery("");
      setStudentOpen(false);
      setShowFullCalendar(false);
      setShowDurationCustom(false);
      setShowRepeatsCustom(false);
      setShowCountCustom(false);
      setDuration("60");
      setIsRecurring(false);
      setRecurrenceRule("weekly");
      setRecurrenceCount("8");
      setCustomIntervalDays("21");
      setDate(localDateStr());
      userPickedTimeRef.current = false;
      userPickedDurationRef.current = false;
    }
  }, [showNewLesson, students, selectedStudent]);

  // Smart time seeding — recompute the suggested time when date or student
  // changes, but only before the user has manually picked a time. Priority:
  //   1. The latest existing lesson on the selected date (back-to-back)
  //   2. The most recent prior lesson with the selected student (consistency)
  //   3. nextHalfHour() from "now" (current behavior)
  useEffect(() => {
    if (!showNewLesson) return;
    if (userPickedTimeRef.current) return;

    const toLocalDate = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const toHHmm = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    // 1. Latest lesson already on this day (sorted ascending → take last)
    const sameDay = upcomingLessons
      .filter((l) => toLocalDate(l.scheduled_at) === date)
      .sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
    if (sameDay.length > 0) {
      const last = sameDay[sameDay.length - 1];
      const endMs =
        new Date(last.scheduled_at).getTime() + (last.duration_min ?? 60) * 60_000;
      const endIso = new Date(endMs).toISOString();
      setTime(toHHmm(endIso));
      return;
    }

    // 2. Most recent prior lesson with this student
    if (selectedStudent) {
      const studentLessons = upcomingLessons
        .filter((l) => l.student_id === selectedStudent)
        .sort(
          (a, b) =>
            new Date(b.scheduled_at).getTime() -
            new Date(a.scheduled_at).getTime()
        );
      if (studentLessons.length > 0) {
        setTime(toHHmm(studentLessons[0].scheduled_at));
        return;
      }
    }

    // 3. Fallback
    setTime(nextHalfHour());
  }, [showNewLesson, date, selectedStudent, upcomingLessons]);

  // Smart duration seeding — if the selected student has a prior lesson,
  // default to that lesson's duration (most teachers stick to one length per
  // student). Only runs before the user manually picks a duration.
  useEffect(() => {
    if (!showNewLesson) return;
    if (userPickedDurationRef.current) return;
    if (!selectedStudent) return;
    const prior = upcomingLessons
      .filter((l) => l.student_id === selectedStudent)
      .sort(
        (a, b) =>
          new Date(b.scheduled_at).getTime() -
          new Date(a.scheduled_at).getTime()
      );
    if (prior.length > 0 && prior[0].duration_min) {
      setDuration(String(prior[0].duration_min));
    }
  }, [showNewLesson, selectedStudent, upcomingLessons]);

  // Fetch the most recent PAST lesson for the selected student. Feeds the
  // "Same as last" prefill chip in the new-lesson dialog.
  useEffect(() => {
    if (!showNewLesson || !selectedStudent) {
      setLastLessonForStudent(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Latest scheduled lesson for this student — past OR future. We want
      // the LAST one on the calendar so the prefill can propose the slot
      // AFTER it (mid-package: if 6/7/8 are booked, prefill slot 9).
      const { data } = await supabase
        .from("lessons")
        .select("*")
        .eq("student_id", selectedStudent)
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      setLastLessonForStudent(data && data[0] ? (data[0] as Lesson) : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [showNewLesson, selectedStudent, supabase]);

  // Keep the selected day-strip chip centered when date changes / dialog opens
  useEffect(() => {
    if (!showNewLesson) return;
    // Defer one frame so the chip exists in the DOM
    const id = requestAnimationFrame(() => {
      dateStripSelectedRef.current?.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(id);
  }, [showNewLesson, date]);

  // Click-outside to close the student dropdown
  useEffect(() => {
    if (!studentOpen) return;
    function handle(e: MouseEvent) {
      if (
        studentWrapRef.current &&
        !studentWrapRef.current.contains(e.target as Node)
      ) {
        setStudentOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [studentOpen]);

  async function handleCreateLesson(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Combine date and time
      const dateTime = new Date(`${date}T${time}:00`).toISOString();

      if (isRecurring) {
        const startDate = new Date(dateTime);
        const groupId = crypto.randomUUID();
        const count = parseInt(recurrenceCount) || 8;
        const rows = [];

        // Resolve interval from recurrenceRule. "monthly" uses true month math
        // (setMonth) so it never drifts. "every-3w" = 21 days. "custom:N" parses
        // N out of the rule string. Falls back to weekly = 7 days.
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
            student_id: selectedStudent,
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
          student_id: selectedStudent,
          scheduled_at: dateTime,
          duration_min: parseInt(duration) || 60,
        });
        if (error) throw error;
      }

      setShowNewLesson(false);
      setSelectedStudent("");
      setStudentQuery("");
      setDate(localDateStr());
      setTime(nextHalfHour());
      setIsRecurring(false);
      fetchData(true); // refresh without full-page loading flash
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create lesson");
    } finally {
      setSaving(false);
    }
  }

  const todayLessons = upcomingLessons
    .filter(
      (l) =>
        new Date(l.scheduled_at).toDateString() === new Date().toDateString()
    )
    .sort((a, b) => {
      // Finished lessons sink to the bottom; active (upcoming + in_progress)
      // stay at the top. Within each group, sort by scheduled time.
      const now = Date.now();
      const endOf = (l: typeof a) =>
        new Date(l.scheduled_at).getTime() + (l.duration_min ?? 60) * 60_000;
      const aFinished = endOf(a) <= now ? 1 : 0;
      const bFinished = endOf(b) <= now ? 1 : 0;
      if (aFinished !== bFinished) return aFinished - bFinished;
      return (
        new Date(a.scheduled_at).getTime() -
        new Date(b.scheduled_at).getTime()
      );
    });

  // Filter by LOCAL date, not UTC, so evening lessons in western timezones
  // don't bleed into the next day's bucket and break sort order.
  const toLocalDateStr = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const selectedDateLessons = upcomingLessons
    .filter((l) => toLocalDateStr(l.scheduled_at) === selectedDate)
    .sort((a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );

  // --- New-lesson dialog derived values ---

  // Conflict detection: does (date, time, duration) overlap any existing
  // upcoming lesson? Returns the first overlapping lesson or null. Teachers
  // sometimes double-book intentionally (makeups), so this is a hint not a block.
  const newLessonConflict = (() => {
    if (!date || !time) return null;
    const start = new Date(`${date}T${time}:00`).getTime();
    const end = start + (parseInt(duration) || 60) * 60_000;
    for (const l of upcomingLessons) {
      if (l.status === "cancelled") continue;
      const lStart = new Date(l.scheduled_at).getTime();
      const lEnd = lStart + (l.duration_min ?? 60) * 60_000;
      if (start < lEnd && end > lStart) return l;
    }
    return null;
  })();

  // End-date label for recurring CTA subtitle ("through Aug 6"). Uses the same
  // interval math as handleCreateLesson so it stays accurate.
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

  // "Continue pattern" prefill — based on the student's latest scheduled
  // lesson (past or future). Jumps the date to ONE INTERVAL past that
  // lesson using its own recurrence_rule when possible, so mid-package
  // users land in a free slot instead of colliding with an existing one.
  const lastLessonPrefill = (() => {
    if (!lastLessonForStudent) return null;
    const last = new Date(lastLessonForStudent.scheduled_at);
    const durMin = lastLessonForStudent.duration_min ?? 60;

    // Resolve interval from the existing lesson's recurrence_rule. Falls
    // back to weekly (7) for one-offs — most common case.
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

    const nextIso = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    const hh = `${String(last.getHours()).padStart(2, "0")}:${String(last.getMinutes()).padStart(2, "0")}`;
    const nextWeekday = next.toLocaleDateString([], { weekday: "short" });
    const nextDayNum = next.getDate();
    const nextMonth = next.toLocaleDateString([], { month: "short" });
    const timeLabel = next.toLocaleTimeString([], {
      hour: "numeric",
      minute: next.getMinutes() === 0 ? undefined : "2-digit",
    }).toLowerCase();
    return {
      label: `${nextWeekday} ${nextMonth} ${nextDayNum} · ${timeLabel} · ${durMin} min`,
      nextIso,
      hh,
      durMin,
    };
  })();

  function applyLastLessonPrefill() {
    if (!lastLessonPrefill) return;
    setDate(lastLessonPrefill.nextIso);
    setTime(lastLessonPrefill.hh);
    setDuration(String(lastLessonPrefill.durMin));
    userPickedTimeRef.current = true;
    userPickedDurationRef.current = true;
  }

  // ⌘/Ctrl+Enter submits the form from anywhere inside the dialog.
  function handleDialogKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  }

  if (loading) {
    return <p className="text-center py-12 text-gray-500">Loading...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6 keepsy-rise keepsy-rise-1">
        <div>
          <h1
            className="font-display"
            style={{
              fontSize: "34px",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              color: "var(--ink-primary)",
              lineHeight: "38px",
            }}
          >
            {new Date().toLocaleDateString([], { weekday: "long" })}
            {refreshing && (
              <span className="ml-2 text-sm font-normal text-gray-400 font-sans">Saving…</span>
            )}
          </h1>
          {activeTab === "today" && (
            <p style={{ fontSize: "13px", color: "var(--ink-tertiary)", marginTop: "4px" }}>
              {new Date().toLocaleDateString([], { month: "long", day: "numeric" })}
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowNewLesson(true)}
          style={{
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent-ink)",
            boxShadow: "none",
            border: "1px solid rgba(165, 82, 42, 0.14)",
          }}
        >
          + New
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        const next = v as "today" | "calendar";
        setActiveTab(next);
        // Reset Schedule view back to today whenever the user navigates into it,
        // so it never reopens stuck on a date/month they browsed to last time.
        if (next === "calendar") {
          const now = new Date();
          setSelectedDate(localDateStr(now));
          setScheduleViewYear(now.getFullYear());
          setScheduleViewMonth(now.getMonth());
        }
      }} className="w-full keepsy-rise keepsy-rise-2">
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">
            Today ({todayLessons.length})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1">
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* TODAY TAB */}
        <TabsContent value="today" className="mt-4 space-y-4">
          {todayLessons.length === 0 ? (
            <p
              className="text-center py-12 font-display"
              style={{
                fontSize: "20px",
                fontStyle: "italic",
                color: "var(--ink-tertiary)",
                letterSpacing: "0.005em",
              }}
            >
              A quiet day.
            </p>
          ) : (
            (() => {
              const now = Date.now();
              const endOf = (l: Lesson) =>
                new Date(l.scheduled_at).getTime() + (l.duration_min ?? 60) * 60_000;
              const inProgress = todayLessons.filter(
                (l) => new Date(l.scheduled_at).getTime() <= now && endOf(l) > now
              );
              const upcoming = todayLessons.filter(
                (l) => new Date(l.scheduled_at).getTime() > now
              );
              const finished = todayLessons.filter((l) => endOf(l) <= now);
              // Anchor = first in-progress card if any, else next upcoming
              const anchorId = inProgress[0]?.id ?? upcoming[0]?.id;
              return (
                <>
                  {inProgress.length === 0 && upcoming.length === 0 && finished.length > 0 && (
                    <p
                      className="text-center py-6"
                      style={{ fontSize: "14px", color: "var(--ink-secondary)" }}
                    >
                      All done for today — {finished.length} {finished.length === 1 ? "lesson" : "lessons"} wrapped. ✓
                    </p>
                  )}
                  {inProgress.length > 0 && (
                    <div>
                      <div
                        className="flex items-center gap-3 mb-4"
                        style={{ color: "var(--ink-tertiary)" }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--accent-ink)",
                          }}
                        >
                          Now
                        </span>
                        <span
                          className="flex-1"
                          style={{ height: "1px", background: "var(--line-subtle)" }}
                        />
                      </div>
                      <div className="space-y-3">
                        {inProgress.map((lesson, i) => (
                          <LessonCard
                            key={lesson.id}
                            lesson={lesson}
                            index={i}
                            isAnchor={lesson.id === anchorId}
                            onRefresh={() => fetchData(true)}
                            siblingLessons={upcomingLessons}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {upcoming.length > 0 && (
                    <div style={{ paddingTop: inProgress.length > 0 ? "24px" : 0 }}>
                      <div
                        className="flex items-center gap-3 mb-4"
                        style={{ color: "var(--ink-tertiary)" }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          Up next · {upcoming.length}
                        </span>
                        <span
                          className="flex-1"
                          style={{ height: "1px", background: "var(--line-subtle)" }}
                        />
                      </div>
                      <div className="space-y-3">
                        {upcoming.map((lesson, i) => (
                          <LessonCard
                            key={lesson.id}
                            lesson={lesson}
                            index={inProgress.length + i}
                            isAnchor={inProgress.length === 0 && lesson.id === anchorId}
                            onRefresh={() => fetchData(true)}
                            siblingLessons={upcomingLessons}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {finished.length > 0 && (
                    <div style={{ paddingTop: "32px" }}>
                      <button
                        type="button"
                        onClick={() => setShowFinished((v) => !v)}
                        className="w-full flex items-center gap-3 mb-4 transition-colors"
                        style={{ color: "var(--ink-tertiary)", opacity: 0.6 }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                          }}
                        >
                          Finished · {finished.length}
                        </span>
                        <span
                          className="flex-1"
                          style={{ height: "1px", background: "var(--line-subtle)" }}
                        />
                        <span style={{ fontSize: "10px" }}>
                          {showFinished ? "Hide" : "Show"}
                        </span>
                      </button>
                      <div className="finished-collapse" data-open={showFinished}>
                        <div>
                          <div className="space-y-3">
                            {finished.map((lesson, i) => (
                              <LessonCard
                                key={lesson.id}
                                lesson={lesson}
                                index={inProgress.length + upcoming.length + i}
                                onRefresh={() => fetchData(true)}
                                siblingLessons={upcomingLessons}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          )}

        </TabsContent>

        {/* SCHEDULE TAB */}
        <TabsContent value="calendar" className="mt-4">
          {(() => {
            const today = new Date();
            const todayStr = localDateStr(today);
            const todayMonth = today.getMonth();
            const todayYear = today.getFullYear();
            const loadByDate = new Map<string, number>();
            for (const l of upcomingLessons) {
              const k = toLocalDateStr(l.scheduled_at);
              loadByDate.set(k, (loadByDate.get(k) ?? 0) + 1);
            }
            const isToday = selectedDate === todayStr;
            const isTodayMonth =
              scheduleViewMonth === todayMonth && scheduleViewYear === todayYear;
            const showJumpToToday = !isToday || !isTodayMonth;
            return (
              <>
                <CalendarPicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  loadByDate={loadByDate}
                  emphasizeToday
                  viewMonth={scheduleViewMonth}
                  viewYear={scheduleViewYear}
                  onViewChange={(y, m) => {
                    setScheduleViewYear(y);
                    setScheduleViewMonth(m);
                  }}
                />

                {showJumpToToday && (
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(todayStr);
                        setScheduleViewYear(todayYear);
                        setScheduleViewMonth(todayMonth);
                      }}
                      className="transition-colors hover:underline"
                      style={{
                        fontSize: "12px",
                        color: "var(--ink-tertiary)",
                      }}
                    >
                      Jump to today
                    </button>
                  </div>
                )}

                <div
                  className={showJumpToToday ? "mt-4" : "mt-5"}
                  style={{
                    paddingLeft: "12px",
                    borderLeft: `2px solid ${
                      isToday ? "var(--accent)" : "var(--line-strong)"
                    }`,
                  }}
                >
                  <div
                    className="flex items-baseline gap-2 mb-3"
                    style={{ color: "var(--ink-secondary)" }}
                  >
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "var(--ink-primary)",
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {new Date(selectedDate + "T12:00:00").toLocaleDateString([], {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>
                    {isToday && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "var(--accent-cool)",
                        }}
                      >
                        Today
                      </span>
                    )}
                  </div>

                  {selectedDateLessons.length === 0 ? (
                    <p
                      className="text-center py-8 font-display"
                      style={{
                        fontSize: "15px",
                        fontStyle: "italic",
                        color: "var(--ink-tertiary)",
                        letterSpacing: "0.005em",
                      }}
                    >
                      Nothing scheduled. Enjoy your day off.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateLessons.map((lesson) => (
                        <LessonCard
                          key={lesson.id}
                          lesson={lesson}
                          onRefresh={() => fetchData(true)}
                          siblingLessons={upcomingLessons}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* New Lesson Dialog */}
      <Dialog open={showNewLesson} onOpenChange={setShowNewLesson}>
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
              New lesson
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleCreateLesson}
            onKeyDown={handleDialogKeyDown}
            className="min-w-0 flex flex-col"
            style={{ flex: "1 1 auto", minHeight: 0 }}
          >
          <div
            className="space-y-5 min-w-0"
            style={{
              flex: "1 1 auto",
              overflowY: "auto",
              padding: "16px 24px 16px 24px",
            }}
          >
            {/* Student */}
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
                const selectedObj = students.find((s) => s.id === selectedStudent);
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
                      className="w-full flex items-center justify-between transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        border: studentOpen
                          ? "1px solid var(--accent)"
                          : "1px solid var(--line-strong)",
                        borderRadius: "12px",
                        padding: "10px 14px",
                        height: "44px",
                        fontSize: "15px",
                        color: selectedObj
                          ? "var(--ink-primary)"
                          : "var(--ink-tertiary)",
                        cursor: students.length === 0 ? "not-allowed" : "pointer",
                        textAlign: "left",
                        transition: "border-color 120ms ease",
                      }}
                    >
                      <span style={{ fontWeight: selectedObj ? 500 : 400 }}>
                        {students.length === 0
                          ? "No students yet"
                          : selectedObj
                          ? selectedObj.name
                          : "Pick a student"}
                      </span>
                      {selectedObj ? (
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
                            placeholder="Search…"
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
                        <ul
                          className="overflow-auto"
                          style={{ maxHeight: "260px" }}
                        >
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
                                    color: isSel
                                      ? "var(--accent-ink)"
                                      : "var(--ink-primary)",
                                    backgroundColor: isSel
                                      ? "var(--accent-soft)"
                                      : "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: isSel ? 500 : 400,
                                  }}
                                >
                                  <span>{s.name}</span>
                                  {isSel && (
                                    <span
                                      style={{
                                        color: "var(--accent-ink)",
                                        fontSize: "14px",
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </button>
                              </li>
                            );
                          })}
                          {filtered.length === 0 && (
                            <li
                              style={{
                                padding: "12px 14px",
                                fontSize: "13px",
                                color: "var(--ink-tertiary)",
                              }}
                            >
                              No matches
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Ambient suggestion — lives inside the student section because
                  it's derived from the selected student. Reads as observation
                  ("usually …") on the left, single verb action ("Use") on the
                  right. No arrow, no glyphs that could be confused with
                  navigation. Hides once the form already matches it. */}
              {lastLessonPrefill && (() => {
                const applied =
                  date === lastLessonPrefill.nextIso &&
                  time === lastLessonPrefill.hh &&
                  duration === String(lastLessonPrefill.durMin);
                if (applied) return null;
                return (
                  <div
                    className="flex items-baseline justify-between gap-3"
                    style={{
                      marginTop: "14px",
                      marginBottom: "4px",
                      paddingLeft: "2px",
                      paddingRight: "2px",
                    }}
                  >
                    <div
                      className="flex items-baseline gap-2 min-w-0"
                      style={{ fontSize: "13px" }}
                    >
                      <span
                        style={{
                          color: "var(--ink-tertiary)",
                          fontWeight: 500,
                          textTransform: "lowercase",
                          letterSpacing: "0.02em",
                        }}
                      >
                        suggested:
                      </span>
                      <span
                        className="truncate"
                        style={{
                          color: "var(--ink-secondary)",
                          fontWeight: 400,
                        }}
                      >
                        {lastLessonPrefill.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={applyLastLessonPrefill}
                      className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
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
                        letterSpacing: "0.01em",
                      }}
                    >
                      Accept
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* When (date + time grouped) */}
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
                    style={{
                      fontSize: "13px",
                      fontStyle: "italic",
                      color: "var(--ink-tertiary)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {new Date(date + "T12:00:00").toLocaleDateString([], {
                      month: "long",
                      year:
                        new Date(date + "T12:00:00").getFullYear() !==
                        new Date().getFullYear()
                          ? "numeric"
                          : undefined,
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullCalendar((s) => !s)}
                  aria-label={showFullCalendar ? "Close calendar" : "Open full calendar"}
                  className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    border: showFullCalendar
                      ? "1px solid var(--accent)"
                      : "1px solid transparent",
                    backgroundColor: showFullCalendar
                      ? "var(--accent-soft)"
                      : "transparent",
                    color: showFullCalendar
                      ? "var(--accent-ink)"
                      : "var(--ink-tertiary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {showFullCalendar ? "Close" : "Calendar"}
                </button>
              </div>

              {/* Horizontal date strip — next 14 days. Calendar fallback below. */}
              {!showFullCalendar && (
                <div className="relative">
                <div
                  className="flex gap-2 overflow-x-auto pb-1"
                  style={{
                    scrollbarWidth: "none",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  {(() => {
                    // Selection-centered window: 7 days before and 7 after the
                    // selected date. Today is no longer the strip's hard left
                    // edge — it's just a subtle anchor (outlined when not
                    // selected). Past dates are clickable too (e.g. logging
                    // makeups after the fact).
                    const todayStr = (() => {
                      const t = new Date();
                      t.setHours(0, 0, 0, 0);
                      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
                    })();
                    const sel = new Date(date + "T12:00:00");
                    sel.setHours(0, 0, 0, 0);
                    return Array.from({ length: 15 }, (_, i) => {
                      const offset = i - 7; // -7..+7
                      const d = new Date(sel);
                      d.setDate(d.getDate() + offset);
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      const isSelected = iso === date;
                      const isToday = iso === todayStr;
                      const weekday = d.toLocaleDateString([], { weekday: "short" });
                      const dayNum = d.getDate();
                      // Month is carried by the `when  June` header label now,
                      // so every chip stays consistent with weekday/number.
                      const topLabel = weekday.toLowerCase();
                      // Border priority: selected (warm filled) > today (warm outline) > default
                      const border = isSelected
                        ? "1px solid var(--accent)"
                        : isToday
                        ? "1px solid var(--accent)"
                        : "1px solid var(--line-strong)";
                      const bg = isSelected
                        ? "var(--accent-soft)"
                        : "var(--bg-surface)";
                      const fg = isSelected
                        ? "var(--accent-ink)"
                        : isToday
                        ? "var(--accent-ink)"
                        : "var(--ink-primary)";
                      return (
                        <button
                          key={iso}
                          ref={isSelected ? dateStripSelectedRef : undefined}
                          type="button"
                          onClick={() => setDate(iso)}
                          className="flex flex-col items-center justify-center transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                          style={{
                            flex: "0 0 auto",
                            width: "52px",
                            height: "64px",
                            borderRadius: "12px",
                            border,
                            backgroundColor: bg,
                            color: fg,
                            gap: "2px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 500,
                              textTransform: "lowercase",
                              letterSpacing: "0.04em",
                              opacity: isSelected ? 0.7 : 0.55,
                            }}
                          >
                            {topLabel}
                          </span>
                          <span
                            className="font-display-numerals"
                            style={{
                              fontSize: "20px",
                              fontWeight: 500,
                              letterSpacing: "-0.01em",
                              lineHeight: 1,
                            }}
                          >
                            {dayNum}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
                {/* Right-edge fade — signals "more days exist, scroll" */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: "32px",
                    pointerEvents: "none",
                    background:
                      "linear-gradient(to right, rgba(244, 237, 224, 0) 0%, var(--bg-canvas) 100%)",
                  }}
                />
                </div>
              )}

              {showFullCalendar && (
                <div className="mt-2">
                  <CalendarPicker
                    value={date}
                    onChange={(d) => {
                      setDate(d);
                      setShowFullCalendar(false);
                    }}
                    compact
                  />
                </div>
              )}

              <div
                className="font-display-numerals"
                style={{
                  marginTop: "10px",
                  marginBottom: "4px",
                  marginLeft: "2px",
                  fontSize: "13px",
                  fontStyle: "italic",
                  color: "var(--ink-tertiary)",
                  letterSpacing: "0.01em",
                }}
              >
                at
              </div>
              <div>
                <TimePickerInput
                  key={showNewLesson ? "open" : "closed"}
                  value={time}
                  onChange={(t) => {
                    userPickedTimeRef.current = true;
                    setTime(t);
                  }}
                />
              </div>
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
                    Overlaps with {newLessonConflict.student?.name ?? "another lesson"} ·{" "}
                    {new Date(newLessonConflict.scheduled_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    }).toLowerCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Duration */}
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
                duration
              </label>
              <div className="flex flex-wrap gap-1.5">
                {["30", "45", "60", "90"].map((d) => {
                  const isPresetActive = ["30", "45", "60", "90"].includes(duration);
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
                      className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: 500,
                        border: selected
                          ? "1px solid var(--accent)"
                          : "1px solid var(--line-strong)",
                        backgroundColor: selected
                          ? "var(--accent-soft)"
                          : "var(--bg-surface)",
                        color: selected
                          ? "var(--accent-ink)"
                          : "var(--ink-primary)",
                      }}
                    >
                      {d} min
                    </button>
                  );
                })}
                {(() => {
                  const customActive =
                    showDurationCustom || !["30", "45", "60", "90"].includes(duration);
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        userPickedDurationRef.current = true;
                        setShowDurationCustom((s) => {
                          const next = !s;
                          // When opening, seed a non-preset value so it visibly is custom
                          if (next && ["30", "45", "60", "90"].includes(duration)) {
                            setDuration("20");
                          }
                          return next;
                        });
                      }}
                      aria-label="Custom duration"
                      className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                      style={{
                        padding: "8px 12px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 500,
                        border: customActive
                          ? "1px solid var(--accent)"
                          : "1px solid var(--line-strong)",
                        backgroundColor: customActive
                          ? "var(--accent-soft)"
                          : "var(--bg-surface)",
                        color: customActive
                          ? "var(--accent-ink)"
                          : "var(--ink-secondary)",
                        lineHeight: 1,
                      }}
                    >
                      Other
                    </button>
                  );
                })()}
              </div>

              {(showDurationCustom || !["30", "45", "60", "90"].includes(duration)) && (
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
                    className="font-display-numerals focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      fontSize: "14px",
                      width: "80px",
                      border: "1px solid var(--line-strong)",
                      backgroundColor: "var(--bg-canvas)",
                      color: "var(--ink-primary)",
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>
                    minutes
                  </span>
                </div>
              )}
            </div>

            {/* Repeats — chip row that replaces Switch + pattern dropdown */}
            {!isRecurring ? (
              <button
                type="button"
                onClick={() => {
                  setIsRecurring(true);
                  setRecurrenceRule("weekly");
                }}
                className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
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
                }}
              >
                <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span>
                make it recurring
              </button>
            ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--ink-secondary)",
                    textTransform: "lowercase",
                    letterSpacing: "0.02em",
                  }}
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
                  className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "12px",
                    color: "var(--ink-tertiary)",
                    padding: "2px 4px",
                    letterSpacing: "0.01em",
                  }}
                >
                  – just one lesson
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "weekly", label: "Weekly" },
                  { id: "biweekly", label: "Biweekly" },
                  { id: "monthly", label: "Monthly" },
                ].map((opt) => {
                  const selected = isRecurring && recurrenceRule === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          // tap active chip again to clear
                          setIsRecurring(false);
                        } else {
                          setIsRecurring(true);
                          setRecurrenceRule(opt.id);
                        }
                        setShowRepeatsCustom(false);
                      }}
                      className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                      style={{
                        padding: "8px 16px",
                        borderRadius: "10px",
                        fontSize: "14px",
                        fontWeight: 500,
                        border: selected
                          ? "1px solid var(--accent)"
                          : "1px solid var(--line-strong)",
                        backgroundColor: selected
                          ? "var(--accent-soft)"
                          : "var(--bg-surface)",
                        color: selected
                          ? "var(--accent-ink)"
                          : "var(--ink-primary)",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                {(() => {
                  const customActive =
                    showRepeatsCustom ||
                    (isRecurring && recurrenceRule.startsWith("custom:"));
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setShowRepeatsCustom((s) => {
                          const next = !s;
                          if (next) {
                            // Switch to a custom interval rule immediately so
                            // any preset chip (Weekly/Biweekly/Monthly) drops
                            // its highlight.
                            setIsRecurring(true);
                            setRecurrenceRule(`custom:${customIntervalDays}`);
                          }
                          return next;
                        });
                      }}
                      aria-label="Custom interval"
                      className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: 500,
                        border: customActive
                          ? "1px solid var(--accent)"
                          : "1px solid var(--line-strong)",
                        backgroundColor: customActive
                          ? "var(--accent-soft)"
                          : "var(--bg-surface)",
                        color: customActive
                          ? "var(--accent-ink)"
                          : "var(--ink-secondary)",
                        lineHeight: 1,
                      }}
                    >
                      Other
                    </button>
                  );
                })()}
              </div>

              {(showRepeatsCustom ||
                (isRecurring && recurrenceRule.startsWith("custom:"))) && (
                <div className="mt-2 flex items-center gap-1">
                  <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>
                    every
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customIntervalDays}
                    onChange={(e) => {
                      setCustomIntervalDays(e.target.value);
                      setIsRecurring(true);
                      setRecurrenceRule(`custom:${e.target.value}`);
                    }}
                    className="font-display-numerals focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                    style={{
                      padding: "4px 8px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      width: "56px",
                      border:
                        recurrenceRule.startsWith("custom:")
                          ? "1px solid var(--accent)"
                          : "1px solid var(--line-strong)",
                      backgroundColor: "var(--bg-canvas)",
                      color: "var(--ink-primary)",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}>
                    days
                  </span>
                </div>
              )}

              {isRecurring && (
                <div className="mt-3">
                  <label
                    className="block mb-2"
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "var(--ink-tertiary)",
                      textTransform: "lowercase",
                      letterSpacing: "0.02em",
                    }}
                  >
                    how many
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["4", "8", "12", "16", "24"].map((n) => {
                      const isPresetCount = ["4", "8", "12", "16", "24"].includes(
                        recurrenceCount
                      );
                      const selected = n === recurrenceCount && isPresetCount;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => {
                            setRecurrenceCount(n);
                            setShowCountCustom(false);
                          }}
                          className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                          style={{
                            padding: "8px 14px",
                            borderRadius: "10px",
                            fontSize: "14px",
                            fontWeight: 500,
                            border: selected
                              ? "1px solid var(--accent)"
                              : "1px solid var(--line-strong)",
                            backgroundColor: selected
                              ? "var(--accent-soft)"
                              : "var(--bg-surface)",
                            color: selected
                              ? "var(--accent-ink)"
                              : "var(--ink-primary)",
                          }}
                        >
                          {n}
                        </button>
                      );
                    })}
                    {(() => {
                      const customActive =
                        showCountCustom ||
                        !["4", "8", "12", "16", "24"].includes(recurrenceCount);
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setShowCountCustom((s) => {
                              const next = !s;
                              if (
                                next &&
                                ["4", "8", "12", "16", "24"].includes(recurrenceCount)
                              ) {
                                setRecurrenceCount("10");
                              }
                              return next;
                            });
                          }}
                          aria-label="Custom count"
                          className="transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                          style={{
                            padding: "8px 14px",
                            borderRadius: "10px",
                            fontSize: "13px",
                            fontWeight: 500,
                            border: customActive
                              ? "1px solid var(--accent)"
                              : "1px solid var(--line-strong)",
                            backgroundColor: customActive
                              ? "var(--accent-soft)"
                              : "var(--bg-surface)",
                            color: customActive
                              ? "var(--accent-ink)"
                              : "var(--ink-secondary)",
                            lineHeight: 1,
                          }}
                        >
                          Other
                        </button>
                      );
                    })()}
                  </div>

                  {(showCountCustom ||
                    !["4", "8", "12", "16", "24"].includes(recurrenceCount)) && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min="2"
                        max="52"
                        value={recurrenceCount}
                        onChange={(e) => setRecurrenceCount(e.target.value)}
                        className="font-display-numerals focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
                        style={{
                          padding: "6px 10px",
                          borderRadius: "8px",
                          fontSize: "14px",
                          width: "80px",
                          border: "1px solid var(--line-strong)",
                          backgroundColor: "var(--bg-canvas)",
                          color: "var(--ink-primary)",
                        }}
                      />
                      <span style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>
                        lessons
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

          </div>
          {/* Sticky footer — CTA pinned to bottom */}
          <div
            style={{
              flex: "0 0 auto",
              padding: "14px 24px 20px 24px",
              borderTop: "1px solid var(--line-strong)",
              boxShadow: "0 -6px 12px -8px rgba(43,31,23,0.10)",
              backgroundColor: "var(--bg-canvas)",
            }}
          >
            <button
              type="submit"
              disabled={saving || !selectedStudent || !date || !time}
              className="w-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
              style={{
                minHeight: "52px",
                padding: "8px 16px",
                borderRadius: "12px",
                backgroundColor: "var(--accent)",
                color: "#FFFFFF",
                fontWeight: 500,
                letterSpacing: "-0.005em",
                border: "none",
                opacity:
                  saving || !selectedStudent || !date || !time ? 0.4 : 1,
                cursor:
                  saving || !selectedStudent || !date || !time
                    ? "not-allowed"
                    : "pointer",
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
                  ? "Creating…"
                  : isRecurring
                  ? `Create ${recurrenceCount} lessons`
                  : "Create lesson"}
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
    </div>
  );
}
