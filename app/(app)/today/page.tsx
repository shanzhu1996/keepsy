"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import TodayNow from "@/components/today-now";
import OnboardingEmpty from "@/components/onboarding-empty";
import AddLessonDialog from "@/components/add-lesson-dialog";
import type { Lesson, Student } from "@/lib/types";

export default function TodayPage() {
  const supabase = createClient();
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [preselectedStudentId, setPreselectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // only true on first load
  const [refreshing, setRefreshing] = useState(false);

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

  // Auto-complete past lessons that are still "scheduled"
  const autoCompleteRan = useRef(false);
  useEffect(() => {
    if (loading || autoCompleteRan.current) return;
    autoCompleteRan.current = true;

    const now = Date.now();
    const pastScheduled = upcomingLessons.filter((l) => {
      const endTime = new Date(l.scheduled_at).getTime() + (l.duration_min ?? 60) * 60_000;
      return l.status === "scheduled" && endTime <= now;
    });
    if (pastScheduled.length === 0) return;

    Promise.all(
      pastScheduled.map((l) =>
        fetch("/api/lessons/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: l.id }),
        }).catch(() => {})
      )
    ).then(() => {
      if (pastScheduled.length > 0) fetchData(true);
    });
  }, [loading, upcomingLessons, fetchData]);

  // Auto-open add lesson dialog if ?addLesson=studentId is in the URL
  useEffect(() => {
    if (typeof window === "undefined" || students.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const addLessonStudent = params.get("addLesson");
    if (addLessonStudent) {
      setPreselectedStudentId(addLessonStudent);
      setShowNewLesson(true);
      window.history.replaceState({}, "", "/today");
    }
  }, [students]);

  const todayLessons = upcomingLessons
    .filter(
      (l) =>
        new Date(l.scheduled_at).toDateString() === new Date().toDateString()
    )
    .sort((a, b) => {
      const now = Date.now();
      const endOf = (l: typeof a) =>
        new Date(l.scheduled_at).getTime() + (l.duration_min ?? 60) * 60_000;
      const aFinished = endOf(a) <= now ? 1 : 0;
      const bFinished = endOf(b) <= now ? 1 : 0;
      if (aFinished !== bFinished) return aFinished - bFinished;
      return (
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
    });

  if (loading) {
    return (
      <p className="text-center py-12" style={{ color: "var(--ink-tertiary)" }}>
        Loading...
      </p>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6 keepsy-rise keepsy-rise-1">
        <div>
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
            {new Date().toLocaleDateString([], { weekday: "long" })}
            {refreshing && (
              <span
                className="ml-2 text-sm font-normal font-sans"
                style={{ color: "var(--ink-tertiary)" }}
              >
                Saving…
              </span>
            )}
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--ink-tertiary)",
              marginTop: "4px",
            }}
          >
            {new Date().toLocaleDateString([], { month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
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
            + Lesson
          </Button>
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex items-center justify-center rounded-full"
            style={{
              width: "36px",
              height: "36px",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--line-strong)",
              color: "var(--ink-secondary)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="keepsy-rise keepsy-rise-2">
        {todayLessons.length === 0 ? (
          students.length === 0 ? (
            <OnboardingEmpty />
          ) : (
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
          )
        ) : (
          <TodayNow lessons={todayLessons} />
        )}
      </div>

      {/* New Lesson Dialog — shared component */}
      <AddLessonDialog
        open={showNewLesson}
        onOpenChange={(open) => {
          setShowNewLesson(open);
          if (!open) setPreselectedStudentId(null);
        }}
        studentId={preselectedStudentId ?? undefined}
        studentName={
          preselectedStudentId
            ? students.find((s) => s.id === preselectedStudentId)?.name
            : undefined
        }
        students={students}
        existingLessons={upcomingLessons}
        onCreated={() => {
          setPreselectedStudentId(null);
          fetchData(true);
        }}
      />
    </div>
  );
}
