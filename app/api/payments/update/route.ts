import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { paymentId, amount } = await request.json();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify payment belongs to user
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select("id, user_id")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .single();

    if (paymentErr || !payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const { error: updateErr } = await supabase
      .from("payments")
      .update({ amount: parseFloat(amount) })
      .eq("id", paymentId)
      .eq("user_id", user.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
