import { getProfile } from "@/lib/settings";
import StudentForm from "@/components/student-form";

export default async function NewStudentPage() {
  const profile = await getProfile();

  return (
    <StudentForm
      defaults={{
        cycleLessons: profile?.default_cycle_lessons ?? 4,
        cyclePrice: profile?.default_cycle_price ?? null,
      }}
    />
  );
}
