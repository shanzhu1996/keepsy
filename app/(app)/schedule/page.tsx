"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import LessonCard from "@/components/lesson-card";
import CalendarPicker from "@/components/calendar-picker";
import AddLessonDialog from "@/components/add-lesson-dialog";
import type { Lesson, Student } from "@/lib/types";

/** "YYYY-MM-DD" for the LOCAL date — avoids UTC drift shifting "today". */
function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function SchedulePage() {
  const supabase = createClient();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(localDateStr());
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const fetchData = useCallback(async () => {
    const [lessonsRes, studentsRes] = await Promise.all([
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
    setLessons(lessonsRes.data ?? []);
    setStudents(studentsRes.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toLocalDateStr = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const selectedDateLessons = lessons
    .filter((l) => toLocalDateStr(l.scheduled_at) === selectedDate)
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );

  if (loading) {
    return (
      <p className="text-center py-12" style={{ color: "var(--ink-tertiary)" }}>
        Loading...
      </p>
    );
  }

  const today = new Date();
  const todayStr = localDateStr(today);
  const loadByDate = new Map<string, number>();
  for (const l of lessons) {
    const k = toLocalDateStr(l.scheduled_at);
    loadByDate.set(k, (loadByDate.get(k) ?? 0) + 1);
  }
  const isToday = selectedDate === todayStr;
  const isTodayMonth =
    viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const showJumpToToday = !isToday || !isTodayMonth;

  return (
    <div>
      <div className="flex justify-between items-start mb-6 keepsy-rise keepsy-rise-1">
        <h1
          className="font-display"
          style={{
            fontSize: "28px",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "var(--ink-primary)",
            lineHeight: "34px",
          }}
        >
          Schedule
        </h1>
        <Button
          size="sm"
          onClick={() => setShowNewLesson(true)}
          style={{
            backgroundColor: "var(--accent)",
            color: "#fff",
            boxShadow: "var(--shadow-cta)",
          }}
        >
          + Lesson
        </Button>
      </div>

      <div className="keepsy-rise keepsy-rise-2">
        <CalendarPicker
          value={selectedDate}
          onChange={setSelectedDate}
          loadByDate={loadByDate}
          emphasizeToday
          viewMonth={viewMonth}
          viewYear={viewYear}
          onViewChange={(y, m) => {
            setViewYear(y);
            setViewMonth(m);
          }}
        />

        {showJumpToToday && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayStr);
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
              }}
              className="transition-colors hover:underline"
              style={{ fontSize: "12px", color: "var(--ink-tertiary)" }}
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
                  onRefresh={() => fetchData()}
                  siblingLessons={lessons}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AddLessonDialog
        open={showNewLesson}
        onOpenChange={setShowNewLesson}
        students={students}
        existingLessons={lessons}
        onCreated={() => fetchData()}
      />
    </div>
  );
}
