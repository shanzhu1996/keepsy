import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePaymentReminder } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { paymentId } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: payment, error } = await supabase
      .from("payments")
      .select("*, student:students(name)")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .single();

    if (error || !payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const message = await generatePaymentReminder(
      payment.student?.name ?? "Student",
      Number(payment.amount),
      payment.lesson_count_covered
    );

    // Save draft to payment
    await supabase
      .from("payments")
      .update({ message_draft: message })
      .eq("id", paymentId);

    return NextResponse.json({ message });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
