import { notFound } from "next/navigation";
import { getStudent } from "@/lib/students";
import StudentForm from "@/components/student-form";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) notFound();

  return <StudentForm student={student} />;
}
