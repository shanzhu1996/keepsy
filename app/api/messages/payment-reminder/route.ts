import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePaymentReminder } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let studentName: string;
    let amount: number;
    let lessonCount: number;

    if (body.paymentId) {
      // Existing payment record — look up details
      const { data: payment, error } = await supabase
        .from("payments")
        .select("*, student:students(name)")
        .eq("id", body.paymentId)
        .eq("user_id", user.id)
        .single();

      if (error || !payment) {
        return NextResponse.json(
          { error: "Payment not found" },
          { status: 404 }
        );
      }

      studentName = payment.student?.name ?? "Student";
      amount = Number(payment.amount);
      lessonCount = payment.lesson_count_covered;

      // Save draft to payment
      const message = await generatePaymentReminder(studentName, amount, lessonCount);
      await supabase
        .from("payments")
        .update({ message_draft: message })
        .eq("id", body.paymentId);

      return NextResponse.json({ message });
    } else {
      // Direct params — for due/overdue cycles without a payment record
      studentName = body.studentName ?? "Student";
      amount = Number(body.amount) || 0;
      lessonCount = Number(body.lessonCount) || 0;

      const message = await generatePaymentReminder(
        studentName,
        amount,
        lessonCount,
        body.status ?? "due",
        body.teacherName ?? null,
        body.dateRange ?? null
      );
      return NextResponse.json({ message });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
