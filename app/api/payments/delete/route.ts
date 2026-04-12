import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { error: deleteErr } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", user.id);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
