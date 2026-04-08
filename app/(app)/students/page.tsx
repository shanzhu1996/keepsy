import Link from "next/link";
import { getStudents } from "@/lib/students";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotePreview from "@/components/note-preview";

export default async function StudentsPage() {
  const students = await getStudents();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Students</h1>
        <Link href="/students/new">
          <Button size="sm">+ Add</Button>
        </Link>
      </div>

      {students.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          No students yet. Add your first student!
        </p>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="block"
            >
              <div className="border rounded-lg p-4 bg-white hover:bg-amber-50 hover:border-amber-200 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{student.name}</h3>
                    {student.email && (
                      <p className="text-sm text-gray-600">{student.email}</p>
                    )}
                    {student.phone && (
                      <p className="text-sm text-gray-600">{student.phone}</p>
                    )}
                  </div>
                  {student.billing_enabled ? (
                    student.lessons_since_last_payment >=
                    (student.billing_cycle_lessons ?? Infinity) ? (
                      <Badge variant="destructive">Payment due</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )
                  ) : (
                    <Badge variant="outline">No billing</Badge>
                  )}
                </div>

                {student.notes && (
                  <NotePreview note={student.notes} />
                )}

                {student.billing_enabled && (
                  <p className="text-xs text-gray-500 mt-2">
                    {student.lessons_since_last_payment} /{" "}
                    {student.billing_cycle_lessons} lessons
                    {student.cycle_price && ` · $${student.cycle_price}/cycle`}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
