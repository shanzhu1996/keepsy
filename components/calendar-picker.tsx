"use client";

import { useEffect, useState } from "react";

interface CalendarPickerProps {
  value: string; // ISO date string: "YYYY-MM-DD"
  onChange: (date: string) => void;
  onClose?: () => void;
  /** Map of ISO date string ("YYYY-MM-DD") → lesson count. Renders a quiet
   *  load bar under days with lessons; opacity increases with count. */
  loadByDate?: Map<string, number>;
  /** When true, "today" is the strong/filled state and a non-today selection is outlined. */
  emphasizeToday?: boolean;
  /** Optional controlled view month (0-indexed). If omitted, view is internal. */
  viewMonth?: number;
  viewYear?: number;
  onViewChange?: (year: number, month: number) => void;
  /** Compact mode: smaller cells, no load bars. Used in tight contexts like form dialogs. */
  compact?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPicker({
  value,
  onChange,
  onClose,
  loadByDate,
  emphasizeToday = false,
  viewMonth: viewMonthProp,
  viewYear: viewYearProp,
  onViewChange,
  compact = false,
}: CalendarPickerProps) {
  const today = new Date();
  const initial = value ? new Date(value + "T12:00:00") : today;

  const [viewYearState, setViewYearState] = useState(initial.getFullYear());
  const [viewMonthState, setViewMonthState] = useState(initial.getMonth());

  const isControlled = viewMonthProp !== undefined && viewYearProp !== undefined;
  const viewYear = isControlled ? (viewYearProp as number) : viewYearState;
  const viewMonth = isControlled ? (viewMonthProp as number) : viewMonthState;

  // When uncontrolled, keep the internal view month in sync with `value` so
  // external date changes (e.g. "NEXT SLOT" prefill) bring the calendar to
  // the right month instead of leaving it stuck on whatever was first shown.
  useEffect(() => {
    if (isControlled || !value) return;
    const v = new Date(value + "T12:00:00");
    if (v.getFullYear() !== viewYearState || v.getMonth() !== viewMonthState) {
      setViewYearState(v.getFullYear());
      setViewMonthState(v.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isControlled]);

  function setView(year: number, month: number) {
    if (isControlled) {
      onViewChange?.(year, month);
    } else {
      setViewYearState(year);
      setViewMonthState(month);
      onViewChange?.(year, month);
    }
  }

  function prevMonth() {
    if (viewMonth === 0) setView(viewYear - 1, 11);
    else setView(viewYear, viewMonth - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) setView(viewYear + 1, 0);
    else setView(viewYear, viewMonth + 1);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Use LOCAL date components — toISOString() returns UTC, so a Thursday
  // evening in PT becomes Friday in UTC and "today" lights up the wrong cell.
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  function toISODate(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  }

  return (
    <div
      className="rounded-xl px-4 py-3 select-none"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--line-strong)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors text-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="font-semibold text-sm text-gray-800">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors text-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const iso = toISODate(day);
          const isSelected = iso === value;
          const isToday = iso === todayStr;
          const lessonCount = loadByDate?.get(iso) ?? 0;
          const hasLesson = lessonCount > 0;
          // Load bar color tiers — same warm hue family, lighter → darker.
          // Full-opacity hex stops avoid the cream background bleeding through.
          const loadColor =
            lessonCount === 0
              ? "transparent"
              : lessonCount <= 2
              ? "#D4A57E" // light tan — quiet day
              : lessonCount <= 4
              ? "#B57645" // mid amber — moderate
              : "#7A3617"; // deep terracotta — busy

          // Style priority differs by context:
          // - default (form picker): selected = strong, today = soft
          // - emphasizeToday (schedule browse): today = strong, selected non-today = outlined
          let cls: string;
          if (emphasizeToday) {
            if (isToday) {
              cls = "bg-amber-600 text-white font-semibold";
            } else if (isSelected) {
              cls = "border border-amber-600 text-amber-800 font-semibold";
            } else {
              cls = "text-gray-700 hover:bg-gray-100";
            }
          } else {
            if (isSelected) {
              cls = "bg-amber-600 text-white font-semibold";
            } else if (isToday) {
              cls = "bg-amber-100 text-amber-800 font-semibold";
            } else {
              cls = "text-gray-700 hover:bg-gray-100";
            }
          }

          const cellSize = compact ? "h-7 w-7 text-[13px]" : "h-8 w-8 text-sm";

          return (
            <div key={iso} className="relative mx-auto flex flex-col items-center">
              <button
                type="button"
                onClick={() => onChange(iso)}
                className={[
                  "flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/70",
                  cellSize,
                  cls,
                ].join(" ")}
              >
                {day}
              </button>
              {!compact && (
                <span
                  aria-hidden
                  className="mt-1"
                  style={{
                    height: "2px",
                    width: "12px",
                    borderRadius: "1px",
                    backgroundColor:
                      !hasLesson || (isToday && emphasizeToday)
                        ? "transparent"
                        : loadColor,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      )}
    </div>
  );
}
