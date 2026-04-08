"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import LessonCard from "@/components/lesson-card";
import type { Lesson } from "@/lib/types";

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform flex-shrink-0 ${collapsed ? "-rotate-90" : ""}`}
      style={{ color: "#374151" }}  /* gray-700 — always visible */
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface WeekGridProps {
  lessons: Lesson[];
}

function getWeekDays(anchorDate: Date): Date[] {
  const days: Date[] = [];
  // Start from Monday
  const day = new Date(anchorDate);
  const dayOfWeek = day.getDay(); // 0 = Sunday
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  day.setDate(day.getDate() + diff);
  for (let i = 0; i < 7; i++) {
    const d = new Date(day);
    d.setDate(day.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function WeekGrid({ lessons }: WeekGridProps) {
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  function toggleDay(dateStr: string) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  }
  const weekDays = getWeekDays(anchorDate);

  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const weekLabel = `${weekStart.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })} – ${weekEnd.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  function prevWeek() {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - 7);
    setAnchorDate(d);
  }

  function nextWeek() {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + 7);
    setAnchorDate(d);
  }

  function goToday() {
    setAnchorDate(new Date());
  }

  // Use local date strings to avoid UTC timezone mismatch
  function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const getLessonsForDay = (day: Date): Lesson[] => {
    const dateStr = toLocalDateStr(day);
    return lessons
      .filter((l) => toLocalDateStr(new Date(l.scheduled_at)) === dateStr)
      .sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() -
          new Date(b.scheduled_at).getTime()
      );
  };

  const today = new Date().toDateString();

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={prevWeek}>
          ← Prev
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{weekLabel}</p>
          <button
            onClick={goToday}
            className="text-xs text-amber-700 hover:underline"
          >
            Jump to today
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={nextWeek}>
          Next →
        </Button>
      </div>

      {/* Day columns */}
      <div className="space-y-3">
        {weekDays.map((day) => {
          const dayLessons = getLessonsForDay(day);
          const isToday = day.toDateString() === today;
          const dayName = day.toLocaleDateString([], { weekday: "short" });
          const dayNum = day.toLocaleDateString([], {
            month: "short",
            day: "numeric",
          });

          const dateStr = toLocalDateStr(day);
          const isCollapsed = collapsedDays.has(dateStr);

          return (
            <div key={dateStr} className="space-y-1">
              {/* Day header — click to collapse/expand */}
              <button
                onClick={() => toggleDay(dateStr)}
                className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left ${
                  isToday
                    ? "bg-amber-100 border border-amber-300"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <ChevronIcon collapsed={isCollapsed} />
                <span
                  className={`text-sm font-semibold ${
                    isToday ? "text-amber-800" : "text-gray-700"
                  }`}
                >
                  {dayName}
                </span>
                <span
                  className={`text-xs ${
                    isToday ? "text-amber-600" : "text-gray-500"
                  }`}
                >
                  {dayNum}
                </span>
                {isToday && (
                  <span className="ml-auto text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full">
                    Today
                  </span>
                )}
                {dayLessons.length > 0 && !isToday && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                    {dayLessons.length} lesson{dayLessons.length !== 1 ? "s" : ""}
                  </span>
                )}
                {dayLessons.length > 0 && isToday && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                    {dayLessons.length} lesson{dayLessons.length !== 1 ? "s" : ""}
                  </span>
                )}
              </button>

              {/* Lessons for this day — hidden when collapsed */}
              {!isCollapsed && (
                <>
                  {dayLessons.length === 0 ? (
                    <p className="text-xs text-gray-400 px-2 py-1">No lessons</p>
                  ) : (
                    <div className="space-y-1 pl-2">
                      {dayLessons.map((lesson) => (
                        <LessonCard key={lesson.id} lesson={lesson} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
