"use client";

import { useState } from "react";

interface CalendarPickerProps {
  value: string; // ISO date string: "YYYY-MM-DD"
  onChange: (date: string) => void;
  onClose?: () => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPicker({ value, onChange, onClose }: CalendarPickerProps) {
  const today = new Date();
  const initial = value ? new Date(value + "T12:00:00") : today;

  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth()); // 0-indexed

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr = today.toISOString().split("T")[0];

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
    <div className="bg-white border border-gray-200 rounded-xl p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors text-lg"
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
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 transition-colors text-lg"
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
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const iso = toISODate(day);
          const isSelected = iso === value;
          const isToday = iso === todayStr;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onChange(iso)}
              className={[
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors",
                isSelected
                  ? "bg-amber-600 text-white font-semibold"
                  : isToday
                  ? "bg-amber-100 text-amber-800 font-semibold"
                  : "text-gray-700 hover:bg-gray-100",
              ].join(" ")}
            >
              {day}
            </button>
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
