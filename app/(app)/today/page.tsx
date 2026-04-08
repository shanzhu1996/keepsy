"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import WeekGrid from "@/components/week-grid";
import type { Lesson, Student } from "@/lib/types";

export default function TodayPage() {
  const supabase = createClient();
  const [upcomingLessons, setUpcomingLessons] = useState<Lesson[]>([]);
  const [pastLessons, setPastLessons] = useState<Lesson[]>([]);
  const [allFutureLessons, setAllFutureLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [loading, setLoading] = useState(true);   // only true on first load
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showPast, setShowPast] = useState(false);
  const [calendarView, setCalendarView] = useState<"day" | "week">("week");

  // New lesson form state
  const [selectedStudent, setSelectedStudent] = useState("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [time, setTime] = useState("09:00");
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Past: last 14 days of lessons
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [upcomingRes, pastRes, studentsRes] = await Promise.all([
      supabase
        .from("lessons")
        .select("*, student:students(*)")
        .gte("scheduled_at", today.toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(100),
      supabase
        .from("lessons")
        .select("*, student:students(*)")
        .gte("scheduled_at", twoWeeksAgo.toISOString())
        .lt("scheduled_at", today.toISOString())
        .order("scheduled_at", { ascending: false })
        .limit(20),
      supabase
        .from("students")
        .select("*")
        .eq("is_active", true)
        .order("name"),
    ]);

    setUpcomingLessons(upcomingRes.data ?? []);
    setPastLessons(pastRes.data ?? []);
    setAllFutureLessons(upcomingRes.data ?? []);
    setStudents(studentsRes.data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        let intervalDays = 7;
        if (recurrenceRule === "biweekly") intervalDays = 14;

        const groupId = crypto.randomUUID();
        const count = parseInt(recurrenceCount) || 8;
        const rows = [];

        for (let i = 0; i < count; i++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + intervalDays * i);
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
      setDate(new Date().toISOString().split("T")[0]);
      setTime("09:00");
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
    .sort((a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );

  const selectedDateLessons = upcomingLessons
    .filter((l) => l.scheduled_at.split("T")[0] === selectedDate)
    .sort((a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );

  if (loading) {
    return <p className="text-center py-12 text-gray-500">Loading...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Lessons{refreshing && <span className="ml-2 text-sm font-normal text-gray-400">Saving…</span>}
        </h1>
        <Button size="sm" onClick={() => setShowNewLesson(true)}>
          + New
        </Button>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">
            Today ({todayLessons.length})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1">
            Calendar
          </TabsTrigger>
        </TabsList>

        {/* TODAY TAB */}
        <TabsContent value="today" className="mt-4 space-y-4">
          {todayLessons.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No lessons today. Enjoy your day off!
            </p>
          ) : (
            <div className="space-y-2">
              {todayLessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} onRefresh={() => fetchData(true)} />
              ))}
            </div>
          )}

          {/* Past lessons section */}
          {pastLessons.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setShowPast(!showPast)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span>Recent ({pastLessons.length} past lessons)</span>
                <span className="text-xs">{showPast ? "▲ Hide" : "▼ Show"}</span>
              </button>

              {showPast && (
                <div className="mt-2 space-y-2">
                  {pastLessons.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} onRefresh={() => fetchData(true)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="mt-4 space-y-4">
          {/* Day / Week sub-toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setCalendarView("week")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                calendarView === "week"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarView("day")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md border transition-colors ${
                calendarView === "day"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              Day
            </button>
          </div>

          {calendarView === "week" ? (
            <WeekGrid lessons={allFutureLessons} />
          ) : (
            <>
              <CalendarPicker
                value={selectedDate}
                onChange={setSelectedDate}
              />

              <div>
                <h3 className="font-semibold mb-3">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString([], {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>

                {selectedDateLessons.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No lessons on this day.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDateLessons.map((lesson) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        onRefresh={() => fetchData(true)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* New Lesson Dialog */}
      <Dialog open={showNewLesson} onOpenChange={setShowNewLesson}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Lesson</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLesson} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Student *</label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Date *</label>
              <CalendarPicker value={date} onChange={setDate} />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Time *</label>
              <TimePickerInput value={time} onChange={setTime} />
            </div>

            <div>
              <label className="text-sm font-medium">Duration (min)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="15"
                step="15"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Recurring</label>
              <Switch
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>

            {isRecurring && (
              <div className="space-y-3 pl-4 border-l-2 border-amber-300">
                <div>
                  <label className="text-sm font-medium">Pattern</label>
                  <Select
                    value={recurrenceRule}
                    onValueChange={setRecurrenceRule}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Number of lessons
                  </label>
                  <Input
                    type="number"
                    value={recurrenceCount}
                    onChange={(e) => setRecurrenceCount(e.target.value)}
                    min="2"
                    max="52"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={saving || !selectedStudent || !date || !time}
            >
              {saving
                ? "Creating..."
                : isRecurring
                ? `Create ${recurrenceCount} Lessons`
                : "Create Lesson"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
