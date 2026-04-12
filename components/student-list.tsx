"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import StudentListCard from "@/components/student-list-card";

interface StudentItem {
  id: string;
  name: string;
  billing_enabled: boolean;
  billing_cycle_lessons: number | null;
  lessons_since_last_payment: number;
  cycle_lessons_offset?: number;
}

interface StudentListProps {
  students: StudentItem[];
  nextLessonLabels: Record<string, string>;
  paymentDueIds: string[];
  completedCounts: Record<string, number>;
}

export default function StudentList({
  students: initialStudents,
  nextLessonLabels,
  paymentDueIds,
  completedCounts,
}: StudentListProps) {
  const [students, setStudents] = useState(initialStudents);
  const paymentDueSet = new Set(paymentDueIds);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(pointerSensor, keyboardSensor);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = students.findIndex((s) => s.id === active.id);
      const newIndex = students.findIndex((s) => s.id === over.id);
      const next = arrayMove(students, oldIndex, newIndex);

      setStudents(next);

      try {
        const res = await fetch("/api/students/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: next.map((s) => s.id) }),
        });
        if (!res.ok) throw new Error("Failed");
      } catch {
        setStudents(students);
      }
    },
    [students]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
    >
      <SortableContext
        items={students.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className="keepsy-rise keepsy-rise-2"
          style={{ display: "flex", flexDirection: "column", gap: "4px" }}
        >
          {students.map((student) => (
            <StudentListCard
              key={student.id}
              student={student}
              nextLessonLabel={nextLessonLabels[student.id]}
              needsPayment={paymentDueSet.has(student.id)}
              completedCount={completedCounts[student.id] ?? 0}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
