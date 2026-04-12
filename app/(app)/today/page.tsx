"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LessonCard from "@/components/lesson-card";
import CalendarPicker from "@/components/calendar-picker";
import AddLessonDialog from "@/components/add-lesson-dialog";
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

  // New lesson form state (minimal — dialog manages its own state now)
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentQuery, setStudentQuery] = useState("");

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

  if (loading) {
    return <p className="text-center py-12" style={{ color: "var(--ink-tertiary)" }}>Loading...</p>;
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
              <span className="ml-2 text-sm font-normal font-sans" style={{ color: "var(--ink-tertiary)" }}>Saving…</span>
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

      {/* New Lesson Dialog — shared component */}
      <AddLessonDialog
        open={showNewLesson}
        onOpenChange={setShowNewLesson}
        students={students}
        existingLessons={upcomingLessons}
        onCreated={() => {
          setSelectedStudent("");
          setStudentQuery("");
          fetchData(true);
        }}
      />
    </div>
  );
}
